import { api } from "@repo/api-client";
import { createGuideTitle } from "@repo/data-commons";

import { restoreStepProgress } from "./session-progress.service";
import { getActiveTeamId } from "@/lib/active-team";
import { isUnauthorizedError } from "@/lib/api-error";
import { authulaClient } from "@/lib/authula-client";
import { withCsrf } from "@/lib/csrf";
import type {
  ExtensionSettings,
  RecordingLifecycleStore,
  RecordingStateMachine,
  SidePanelCommand,
  SidePanelStateUpdate,
  StepJobProgress,
} from "@/models";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";
import { createRecordingSessionService } from "@/services/recording/recording-session.service";
import type { GetSettings, UpdateSettings } from "@/services/settings";
import { createCommandHandler, createStateUpdateBuilder } from "@/services/sidepanel";
import type { PortManager } from "@/services/sidepanel/port-manager.service";

export const createSessionManager = (
  recording: RecordingStateMachine,
  lifecycleStore: RecordingLifecycleStore,
  repository: OutboxRepository,
  getSettings: GetSettings,
  updateSettings: UpdateSettings,
) => {
  const jobProgressMap = new Map<string, StepJobProgress>();
  let isDraining = false;
  let isSignedOut = false;
  let currentPortManager: PortManager | null = null;
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

  const setPortManager = (pm: PortManager) => {
    currentPortManager = pm;
  };

  const clearProgressMap = () => {
    jobProgressMap.clear();
  };

  const getUploadQueueSnapshot = () => {
    const entries = Array.from(jobProgressMap.values());
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let failed = 0;

    for (const entry of entries) {
      switch (entry.phase) {
        case "persisting":
        case "upload_init":
          pending++;
          break;
        case "uploading":
        case "completing":
          inProgress++;
          break;
        case "completed":
          completed++;
          break;
        case "failed":
          failed++;
          break;
      }
    }

    return { pending, inProgress, completed, failed, total: entries.length };
  };

  const getActiveGuideId = async (): Promise<string | undefined> => {
    const lifecycle = await lifecycleStore.get();
    if (!lifecycle.sessionId) {
      return undefined;
    }
    const session = await repository.getSession(lifecycle.sessionId);
    return session?.guideId ?? undefined;
  };

  const stateUpdateBuilder = createStateUpdateBuilder(
    () => recording.getSnapshot(),
    getUploadQueueSnapshot,
    getActiveGuideId,
    () => Array.from(jobProgressMap.values()),
    () => isDraining,
    () => isSignedOut,
  );

  const broadcastUpdate = async () => {
    if (!currentPortManager) return;
    const stateUpdate = await stateUpdateBuilder();
    currentPortManager.broadcast({ type: "state_update", state: stateUpdate });
  };

  const restoreProgress = async (): Promise<void> => {
    const restored = await restoreStepProgress({
      getActiveGuideId,
      listSteps: async (guideId) => {
        const response = await api.steps.getAllStepsByGuideId(
          { guide_id: guideId, limit: 200 },
          await withCsrf(),
        );
        return response.steps;
      },
    });

    for (const progress of restored) {
      jobProgressMap.set(progress.jobId, progress);
    }

    if (restored.length > 0) {
      await broadcastUpdate();
    }
  };

  const handleSessionExpired = async () => {
    if (isSignedOut) {
      return;
    }
    isSignedOut = true;
    isDraining = false;

    recording.stop();
    await recordingSession.expire();
    clearProgressMap();
    await broadcastUpdate();
  };

  const commandHandler = createCommandHandler(
    stateUpdateBuilder,
    recording,
    { getActiveGuideId, setActiveGuideId: async () => {} },
    clearProgressMap,
    getSettings,
    updateSettings,
  );

  const handleSidePanelCommand = async (
    message: SidePanelCommand,
  ): Promise<SidePanelStateUpdate | ExtensionSettings | undefined> => {
    switch (message.command) {
      case "start_recording": {
        isDraining = false;
        isSignedOut = false;
        clearProgressMap();
        clearDedupe?.();
        clearPendingActivations?.();

        try {
          await recordingSession.start();
        } catch (error) {
          if (isUnauthorizedError(error)) {
            isSignedOut = true;
          }
          await broadcastUpdate();
          throw error;
        }

        recording.start();
        await broadcastUpdate();
        return stateUpdateBuilder();
      }
      case "pause_recording": {
        recording.pause();
        await recordingSession.pause();
        await broadcastUpdate();
        return stateUpdateBuilder();
      }
      case "resume_recording": {
        await recordingSession.resume();
        recording.resume();
        await broadcastUpdate();
        return stateUpdateBuilder();
      }
      case "stop_recording": {
        recording.stop();
        isDraining = false;
        await recordingSession.stop();
        await broadcastUpdate();
        return stateUpdateBuilder();
      }
      case "get_status": {
        isSignedOut = (await lifecycleStore.get()).isSignedOut;
        return stateUpdateBuilder();
      }
      case "dismiss_job": {
        if (message.jobId) {
          jobProgressMap.delete(message.jobId);
        }
        await broadcastUpdate();
        return stateUpdateBuilder();
      }
      default:
        return commandHandler.handleCommand(message);
    }
  };

  return {
    stateUpdateBuilder,
    setPortManager,
    setClearDedupe,
    setClearPendingActivations,
    handleSessionExpired,
    handleSidePanelCommand,
    restoreProgress,
    broadcastUpdate,
  };
};

export type SessionManager = ReturnType<typeof createSessionManager>;
