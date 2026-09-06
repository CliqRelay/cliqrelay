import { api } from "@repo/api-client";
import { createGuideTitle } from "@repo/data-commons";

import type {
  CaptureBridgeMessage,
  CaptureMetadataEntry,
  OffscreenEvent,
  RecordingStateMachine,
  SessionService,
  SidePanelCommand,
  StepJobProgress,
} from "@/models";
import type { GetSettings, UpdateSettings } from "@/services/settings";
import type { PortManager } from "@/services/sidepanel/port-manager.service";

import { getActiveTeamId } from "@/lib/active-team";
import { isUnauthorizedError } from "@/lib/api-error";
import { withCsrf } from "@/lib/csrf";
import { createOffscreenManager } from "@/services/background/offscreen-manager.service";
import { createCommandHandler, createStateUpdateBuilder } from "@/services/sidepanel";
import { buildActionText } from "@/utils/action-text";
import { generateCaptureId } from "@/utils/id";

export const createSessionManager = (
  recording: RecordingStateMachine,
  sessionService: SessionService,
  getSettings: GetSettings,
  updateSettings: UpdateSettings,
) => {
  const jobProgressMap = new Map<string, StepJobProgress>();
  const captureMetadataMap = new Map<string, CaptureMetadataEntry>();
  const dismissedJobIds = new Set<string>();
  let isDraining = false;
  let isSignedOut = false;
  let currentPortManager: PortManager | null = null;
  let clearDedupe: (() => void) | undefined;
  let clearPendingActivations: (() => void) | undefined;

  const setClearDedupe = (fn: () => void) => {
    clearDedupe = fn;
  };

  const setClearPendingActivations = (fn: () => void) => {
    clearPendingActivations = fn;
  };

  const getOrCreateGuideId = async (): Promise<{
    guideId: string;
    isNew: boolean;
  }> => {
    const activeGuideId = await sessionService.getActiveGuideId();
    if (activeGuideId) {
      return { guideId: activeGuideId, isNew: false };
    }
    const teamId = await getActiveTeamId();
    try {
      const guideResponse = await api.guides.createGuide(
        { title: createGuideTitle(), teamId: teamId ?? "" },
        await withCsrf(),
      );
      await sessionService.setActiveGuideId(guideResponse.guide.id);
      return { guideId: guideResponse.guide.id, isNew: true };
    } catch (error) {
      if (isUnauthorizedError(error)) {
        // Without this the state machine would keep saying "recording" while
        // every capture is rejected, so the user would think it was working.
        await handleSessionExpired();
      }
      throw error;
    }
  };

  /**
   * Tears the session down when the API says there is no longer a session.
   *
   * The side panel's route guard only covers "signed out when the panel
   * opens"; this is the mid-recording case. The `isSignedOut` flag rides the
   * next state update so the panel can route itself back to sign-in.
   */
  const handleSessionExpired = async () => {
    if (isSignedOut) {
      return;
    }
    isSignedOut = true;
    isDraining = false;

    recording.stop();
    await offscreenManager.stopSession();
    await offscreenManager.closeDocument();
    await sessionService.setActiveGuideId(null);
    clearProgressMap();
    await broadcastUpdate();
  };

  const setPortManager = (pm: PortManager) => {
    currentPortManager = pm;
  };

  const updateJobProgress = (jobId: string, updates: Partial<StepJobProgress>) => {
    const existing = jobProgressMap.get(jobId);
    if (existing) {
      Object.assign(existing, updates);
    }
  };

  const removeJobProgress = (jobId: string) => {
    jobProgressMap.delete(jobId);
    captureMetadataMap.delete(jobId);
    dismissedJobIds.add(jobId);
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

  const clearProgressMap = () => {
    jobProgressMap.clear();
    captureMetadataMap.clear();
    dismissedJobIds.clear();
  };

  const stateUpdateBuilder = createStateUpdateBuilder(
    () => recording.getSnapshot(),
    getUploadQueueSnapshot,
    () => sessionService.getActiveGuideId(),
    () => Array.from(jobProgressMap.values()),
    () => isDraining,
    () => isSignedOut,
  );

  const broadcastUpdate = async () => {
    if (!currentPortManager) return;
    const stateUpdate = await stateUpdateBuilder();
    currentPortManager.broadcast({ type: "state_update", state: stateUpdate });
  };

  const handleOffscreenEvent = async (event: OffscreenEvent) => {
    switch (event.type) {
      case "upload_progress": {
        updateJobProgress(event.jobId, { phase: event.phase });
        break;
      }
      case "job_completed": {
        if (dismissedJobIds.has(event.jobId)) {
          dismissedJobIds.delete(event.jobId);
          captureMetadataMap.delete(event.jobId);
          break;
        }
        const meta = captureMetadataMap.get(event.jobId);
        jobProgressMap.set(event.jobId, {
          jobId: event.jobId,
          stepId: event.stepId,
          guideId: event.guideId,
          action: meta?.action ?? "",
          actionText: event.actionText,
          url: meta?.url ?? "",
          capturedAt: meta?.capturedAt ?? new Date().toISOString(),
          phase: "completed",
          screenshotUrl: event.screenshotUrl,
          thumbnail: event.thumbnail,
          ...(meta?.targetElement ? { targetElement: meta.targetElement } : {}),
        });
        captureMetadataMap.delete(event.jobId);
        await sessionService.setActiveGuideId(event.guideId);

        if (event.navStepId && event.navUrl) {
          const navJobId = `nav-${event.navStepId}`;
          if (!jobProgressMap.has(navJobId)) {
            const navCapturedAt = event.navCapturedAt ?? new Date().toISOString();
            const navTime = new Date(navCapturedAt).getTime() - 1;
            jobProgressMap.set(navJobId, {
              jobId: navJobId,
              stepId: event.navStepId,
              guideId: event.guideId,
              action: "navigation",
              actionText: `Navigate to "${event.navUrl}"`,
              url: event.navUrl,
              capturedAt: new Date(navTime).toISOString(),
              phase: "completed",
              screenshotUrl: event.navScreenshotUrl,
              thumbnail: event.navThumbnail,
            });
          }
        }
        break;
      }
      case "job_failed": {
        if (event.isUnauthorized) {
          await handleSessionExpired();
          break;
        }
        if (dismissedJobIds.has(event.jobId)) {
          dismissedJobIds.delete(event.jobId);
          captureMetadataMap.delete(event.jobId);
          break;
        }
        const existing = jobProgressMap.get(event.jobId);
        if (existing) {
          existing.phase = "failed";
          existing.error = event.error;
          existing.attempts = event.attempt;
        } else {
          const meta = captureMetadataMap.get(event.jobId);
          jobProgressMap.set(event.jobId, {
            jobId: event.jobId,
            stepId: "",
            guideId: "",
            action: meta?.action ?? "",
            actionText: meta?.actionText,
            url: meta?.url ?? "",
            capturedAt: meta?.capturedAt ?? new Date().toISOString(),
            phase: "failed",
            error: event.error,
            attempts: event.attempt,
            ...(meta?.targetElement ? { targetElement: meta.targetElement } : {}),
          });
          captureMetadataMap.delete(event.jobId);
        }
        break;
      }
      case "session_state":
        break;
      case "drain_complete": {
        isDraining = false;
        clearProgressMap();
        await sessionService.setActiveGuideId(null);
        await offscreenManager.closeDocument();
        break;
      }
    }

    await broadcastUpdate();
  };

  const offscreenManager = createOffscreenManager(handleOffscreenEvent, getOrCreateGuideId);

  const commandHandler = createCommandHandler(
    stateUpdateBuilder,
    recording,
    sessionService,
    clearProgressMap,
    getSettings,
    updateSettings,
  );

  let pendingFreeTypingStepId: string | null = null;
  let pendingFreeTypingCaptureId: string | null = null;
  let pendingFreeTypingGuideId: string | null = null;
  let pendingFreeTypingOp: Promise<void> = Promise.resolve();

  const clearPendingFreeTyping = () => {
    pendingFreeTypingStepId = null;
    pendingFreeTypingCaptureId = null;
    pendingFreeTypingGuideId = null;
  };

  const executeFreeTypingCapture = async (captureId: string, message: CaptureBridgeMessage) => {
    const payload = message.payload;

    if (payload.typedText === "") {
      if (pendingFreeTypingStepId) {
        await api.steps.deleteStep(pendingFreeTypingStepId, await withCsrf());
        if (pendingFreeTypingCaptureId) {
          jobProgressMap.delete(pendingFreeTypingCaptureId);
        }
        clearPendingFreeTyping();
      }
      return;
    }

    const guideId = pendingFreeTypingGuideId ?? (await getOrCreateGuideId()).guideId;
    const actionText = buildActionText("input", undefined, payload.typedText);

    if (pendingFreeTypingStepId) {
      await api.steps.updateStep(pendingFreeTypingStepId, { actionText }, await withCsrf());

      const existing = pendingFreeTypingCaptureId && jobProgressMap.get(pendingFreeTypingCaptureId);
      if (existing) {
        existing.actionText = actionText;
      }
    } else {
      const stepResponse = await api.steps.createStep(
        {
          guideId,
          type: "interaction",
          action: "input",
          url: payload.url,
          actionText,
        },
        await withCsrf(),
      );

      pendingFreeTypingStepId = stepResponse.step.id;
      pendingFreeTypingCaptureId = captureId;
      pendingFreeTypingGuideId = guideId;

      jobProgressMap.set(captureId, {
        jobId: captureId,
        stepId: stepResponse.step.id,
        guideId,
        action: "input",
        actionText,
        url: payload.url ?? "",
        capturedAt: payload.capturedAt,
        phase: "completed",
      });
    }
  };

  const handleFreeTypingCapture = async (captureId: string, message: CaptureBridgeMessage) => {
    const currentOp = pendingFreeTypingOp.then(() => executeFreeTypingCapture(captureId, message));

    pendingFreeTypingOp = currentOp.catch(() => {});
    await currentOp;
  };

  const handleSidePanelCommand = async (message: SidePanelCommand) => {
    if (message.command === "start_recording") {
      isDraining = false;
      isSignedOut = false;
      jobProgressMap.clear();
      captureMetadataMap.clear();
      clearPendingFreeTyping();
      clearDedupe?.();
      clearPendingActivations?.();
      void offscreenManager
        .closeDocument()
        .then(() => offscreenManager.startSession(generateCaptureId()));
    }
    if (message.command === "stop_recording") {
      isDraining = true;
      void offscreenManager.stopSession();
    }
    if (message.command === "get_status") {
      // The panel only asks for status when it mounts, and a panel that is
      // mounting has already been through the route guard. Clearing the notice
      // here keeps it from being replayed at every later open.
      isSignedOut = false;
      const snapshot = recording.getSnapshot();
      if (snapshot.status !== "recording" && !isDraining) {
        await sessionService.setActiveGuideId(null);
      }
    }
    if (message.command === "dismiss_job" && message.jobId) {
      removeJobProgress(message.jobId);
      await broadcastUpdate();
      return;
    }
    const result = await commandHandler.handleCommand(message);
    const mutationCommands = [
      "start_recording",
      "pause_recording",
      "resume_recording",
      "stop_recording",
    ] as const;
    if (mutationCommands.includes(message.command as (typeof mutationCommands)[number])) {
      await broadcastUpdate();
    }
    return result;
  };

  return {
    offscreenManager,
    stateUpdateBuilder,
    captureMetadataMap,
    setPortManager,
    setClearDedupe,
    setClearPendingActivations,
    handleSessionExpired,
    handleSidePanelCommand,
    handleOffscreenEvent,
    handleFreeTypingCapture,
    clearPendingFreeTyping,
  };
};

export type SessionManager = ReturnType<typeof createSessionManager>;
