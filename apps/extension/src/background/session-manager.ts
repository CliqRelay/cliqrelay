import { api } from "@repo/api-client";
import { createGuideTitle } from "@repo/data-commons";

import { getActiveTeamId } from "@/lib/active-team";
import { isUnauthorizedError } from "@/lib/api-error";
import { authulaClient } from "@/lib/authula-client";
import { withCsrf } from "@/lib/csrf";
import type {
  ExtensionSettings,
  RecordingLifecycleStore,
  RecordingStateMachine,
  SidePanelCommand,
} from "@/models";
import type { OutboxAuth } from "@/services/outbox/outbox-auth.service";
import type { OutboxBadge } from "@/services/outbox/outbox-badge.service";
import type { OutboxDrainer } from "@/services/outbox/outbox-drainer.service";
import type { OutboxScheduler } from "@/services/outbox/outbox-scheduler.service";
import type { OutboxStepStateRepository } from "@/services/outbox/outbox-step-state.repository";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";
import { createRecordingSessionService } from "@/services/recording/recording-session.service";
import type { GetSettings, UpdateSettings } from "@/services/settings";

type SessionManagerRepository = Pick<
  OutboxRepository,
  | "createSession"
  | "getSession"
  | "updateSession"
  | "setSessionGuideId"
  | "listSessions"
  | "listSteps"
  | "removeStep"
  | "deleteSessionData"
  | "discardForUser"
>;

type SessionManagerDeps = {
  recording: RecordingStateMachine;
  lifecycleStore: RecordingLifecycleStore;
  repository: SessionManagerRepository;
  getSettings: GetSettings;
  updateSettings: UpdateSettings;
  drainer: Pick<OutboxDrainer, "kick" | "kickSession" | "drainAll" | "pause">;
  scheduler: Pick<OutboxScheduler, "start" | "sync">;
  auth: Pick<OutboxAuth, "getUserId">;
  stepState: Pick<OutboxStepStateRepository, "retryFailedSteps">;
  badge: Pick<OutboxBadge, "refresh">;
};

export const createSessionManager = ({
  recording,
  lifecycleStore,
  repository,
  getSettings,
  updateSettings,
  drainer,
  scheduler,
  auth,
  stepState,
  badge,
}: SessionManagerDeps) => {
  let clearDedupe: (() => void) | undefined;
  let clearPendingActivations: (() => void) | undefined;

  const recordingSession = createRecordingSessionService({
    lifecycleStore,
    repository,
    resolveUserId: async () => (await authulaClient.core.getMe()).user.id,
    createGuide: async ({ clientGuideId }) => {
      const teamId = await getActiveTeamId();
      const response = await api.guides.createGuide(
        {
          title: createGuideTitle(),
          teamId: teamId ?? "",
          clientGuideId,
        },
        await withCsrf(),
      );
      return { id: response.guide.id };
    },
    deleteGuide: async (guideId) => {
      await api.guides.deleteGuide(guideId, await withCsrf());
    },
  });

  const setClearDedupe = (fn: () => void) => {
    clearDedupe = fn;
  };

  const setClearPendingActivations = (fn: () => void) => {
    clearPendingActivations = fn;
  };

  const stopIfLive = async (sessionId: string): Promise<void> => {
    const lifecycle = await lifecycleStore.get();
    if (lifecycle.sessionId !== sessionId) {
      return;
    }

    recording.stop();
    await lifecycleStore.patch({ status: "stopped", sessionId: undefined });
  };

  const handleSessionExpired = async (): Promise<void> => {
    const lifecycle = await lifecycleStore.get();
    if (lifecycle.isSignedOut) {
      return;
    }

    if (lifecycle.status === "recording" || lifecycle.status === "paused") {
      recording.stop();
      await recordingSession.expire();
    } else {
      await lifecycleStore.patch({ isSignedOut: true });
    }

    drainer.pause();
    await scheduler.sync();
    await badge.refresh();
  };

  const handleGuideGone = async (sessionId: string): Promise<void> => {
    await stopIfLive(sessionId);
    await badge.refresh();
    await scheduler.sync();
  };

  const handleRetryFailed = async (sessionId?: string): Promise<void> => {
    if (sessionId) {
      await stepState.retryFailedSteps({ sessionId });
      await badge.refresh();
      await scheduler.sync();
      drainer.kickSession(sessionId);
      return;
    }

    const userId = await auth.getUserId();
    if (!userId) {
      return;
    }

    await stepState.retryFailedSteps({ userId });
    await badge.refresh();
    await scheduler.sync();
    await drainer.drainAll();
  };

  const handleDiscardSession = async (sessionId?: string): Promise<void> => {
    if (!sessionId) {
      return;
    }

    await repository.deleteSessionData(sessionId);
    await stopIfLive(sessionId);
    await badge.refresh();
    await scheduler.sync();
  };

  const handleDiscardUserData = async (): Promise<void> => {
    const userId = await auth.getUserId();
    if (!userId) {
      return;
    }

    const lifecycle = await lifecycleStore.get();
    const liveSession = lifecycle.sessionId
      ? await repository.getSession(lifecycle.sessionId)
      : undefined;

    await repository.discardForUser(userId);

    if (liveSession?.userId === userId) {
      await stopIfLive(liveSession.id);
    }

    await badge.refresh();
    await scheduler.sync();
  };

  const handleSidePanelCommand = async (
    message: SidePanelCommand,
  ): Promise<ExtensionSettings | undefined> => {
    switch (message.command) {
      case "start_recording": {
        clearDedupe?.();
        clearPendingActivations?.();

        try {
          await recordingSession.start();
        } catch (error) {
          if (isUnauthorizedError(error)) {
            await lifecycleStore.patch({ isSignedOut: true });
            drainer.pause();
          }
          throw error;
        }

        recording.start();
        await scheduler.start();
        await drainer.drainAll();
        return undefined;
      }
      case "pause_recording": {
        recording.pause();
        await recordingSession.pause();
        return undefined;
      }
      case "resume_recording": {
        await recordingSession.resume();
        recording.resume();
        return undefined;
      }
      case "stop_recording": {
        recording.stop();
        await recordingSession.stop();
        await drainer.kick();
        await scheduler.sync();
        return undefined;
      }
      case "get_settings": {
        return getSettings();
      }
      case "update_settings": {
        if (message.payload) {
          await updateSettings(message.payload);
        }
        return getSettings();
      }
      case "dismiss_step": {
        if (message.stepId) {
          await repository.removeStep(message.stepId);
          await badge.refresh();
          await scheduler.sync();
        }
        return undefined;
      }
      case "retry_failed": {
        await handleRetryFailed(message.sessionId);
        return undefined;
      }
      case "discard_session": {
        await handleDiscardSession(message.sessionId);
        return undefined;
      }
      case "discard_user_data": {
        await handleDiscardUserData();
        return undefined;
      }
      default:
        return undefined;
    }
  };

  return {
    setClearDedupe,
    setClearPendingActivations,
    handleSessionExpired,
    handleGuideGone,
    handleSidePanelCommand,
  };
};

export type SessionManager = ReturnType<typeof createSessionManager>;
