import { browser } from "wxt/browser";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { createBootGate } from "@/background/boot-gate.service";
import { createCaptureHandler } from "@/background/capture-handler";
import { handleOnMessageExternalEvents } from "@/background/external-messages-handler";
import { createOutboxAlarmListener } from "@/background/outbox-alarm.service";
import { createOutboxBoot } from "@/background/outbox-boot.service";
import { restoreRecordingSession } from "@/background/recording-boot.service";
import { createSessionManager } from "@/background/session-manager";
import { env } from "@/constants/env";
import { firefoxBrowser } from "@/constants/firefox-browser";
import { RUNTIME_MESSAGE_TYPES } from "@/constants/runtime-message-types";
import { getActiveTeamId } from "@/lib/active-team";
import { isSessionCookieCleared } from "@/lib/auth-session";
import type { RecordingStatus } from "@/models";
import { createNavigationListener } from "@/services/background";
import { runLegacyCleanup } from "@/services/legacy-cleanup.service";
import { db, outboxRepository } from "@/services/outbox";
import { createOutboxApi } from "@/services/outbox/outbox-api.service";
import { createOutboxAuth } from "@/services/outbox/outbox-auth.service";
import { createOutboxBadge } from "@/services/outbox/outbox-badge.service";
import { createOutboxDeleter } from "@/services/outbox/outbox-deleter.service";
import { createOutboxDiagnostics } from "@/services/outbox/outbox-diagnostics.service";
import { createOutboxDrainer } from "@/services/outbox/outbox-drainer.service";
import { createOutboxPusher } from "@/services/outbox/outbox-pusher.service";
import { createOutboxScheduler } from "@/services/outbox/outbox-scheduler.service";
import { createOutboxStepStateRepository } from "@/services/outbox/outbox-step-state.repository";
import { createOutboxWriter } from "@/services/outbox/outbox-writer.service";
import {
  createRecordingLifecycleStore,
  createRecordingStateMachine,
  recordingStatusStore,
} from "@/services/recording";
import { screenshotService } from "@/services/screenshot";
import { getSettings, updateSettings } from "@/services/settings";
import { isDeveloperBuild } from "@/utils/diagnostics";
import { isMessageOfType, isSidePanelCommand } from "@/utils/message";

export default defineBackground(() => {
  const recordingLifecycleStore = createRecordingLifecycleStore(browser.storage.session);

  const mirrorRecordingStatus = (status: RecordingStatus) => {
    void recordingStatusStore.set(status).catch(() => {});
  };
  const recording = createRecordingStateMachine("idle", mirrorRecordingStatus);

  const stepState = createOutboxStepStateRepository(db);
  const auth = createOutboxAuth();
  const badge = createOutboxBadge({
    action: browser.action,
    countFailed: () => stepState.countFailedSteps(),
  });
  const outboxApi = createOutboxApi();
  const pusher = createOutboxPusher({
    repository: outboxRepository,
    stepState,
    lifecycleStore: recordingLifecycleStore,
    api: outboxApi,
    getActiveTeamId,
  });
  const deleter = createOutboxDeleter({
    repository: outboxRepository,
    stepState,
    api: outboxApi,
  });

  const drainer = createOutboxDrainer({
    repository: outboxRepository,
    pusher,
    deleter,
    auth,
    lifecycleStore: recordingLifecycleStore,
    onStepFailed: () => badge.refresh(),
    onAuthLost: () => sessionManager.handleSessionExpired(),
    onGuideGone: (session) => sessionManager.handleGuideGone(session.id),
    onDrainCompleted: () =>
      scheduler.afterDrain().catch((error: unknown) => {
        console.warn("[background] Outbox post-drain maintenance failed:", error);
      }),
  });

  const scheduler = createOutboxScheduler({
    alarms: browser.alarms,
    lifecycleStore: recordingLifecycleStore,
    repository: outboxRepository,
    drainAll: () => drainer.drainAll(),
    countOutstanding: () => drainer.countOutstanding(),
    onMaintenance: () => badge.refresh(),
  });

  const sessionManager = createSessionManager({
    recording,
    lifecycleStore: recordingLifecycleStore,
    repository: outboxRepository,
    getSettings,
    updateSettings,
    drainer,
    deleter,
    scheduler,
    auth,
    stepState,
    badge,
  });

  const diagnostics = createOutboxDiagnostics({ repository: outboxRepository, drainer });

  const outboxWriter = createOutboxWriter({
    repository: outboxRepository,
    lifecycleStore: recordingLifecycleStore,
    screenshotService,
  });

  const captureHandler = createCaptureHandler({
    writer: outboxWriter,
    recording,
    onStateChanged: () => drainer.kick(),
  });

  const navigationListener = createNavigationListener(recording, outboxWriter);

  const { clearDedupe, clearPendingActivations } = navigationListener.start();
  sessionManager.setClearDedupe(clearDedupe);
  sessionManager.setClearPendingActivations(clearPendingActivations);

  browser.runtime.onMessage.addListener(async (message: unknown, sender, sendResponse) => {
    if (isMessageOfType(message, RUNTIME_MESSAGE_TYPES.GET_CSRF_TOKEN)) {
      try {
        const cookie = await browser.cookies.get({
          url: env.VITE_API_URL,
          name: COOKIE_CONSTANTS.csrf.name,
        });
        return cookie?.value;
      } catch {
        return undefined;
      }
    }

    if (isMessageOfType(message, RUNTIME_MESSAGE_TYPES.GET_ACTIVE_TEAM_ID)) {
      try {
        const cookie = await browser.cookies.get({
          url: env.VITE_WEB_URL,
          name: COOKIE_CONSTANTS.activeTeamId.name,
        });
        return cookie?.value;
      } catch {
        return undefined;
      }
    }

    if (isDeveloperBuild && isMessageOfType(message, RUNTIME_MESSAGE_TYPES.GET_OUTBOX_STATE)) {
      return bootGate.run(() => diagnostics.getState());
    }

    return bootGate.run(() => {
      if (captureHandler.handleCapture(message, sender)) {
        return;
      }

      if (isSidePanelCommand(message)) {
        return sessionManager.handleSidePanelCommand(message);
      }

      if (typeof message === "object" && message !== null && "action" in message) {
        return handleOnMessageExternalEvents(message, sender, sendResponse);
      }
    });
  });

  browser.cookies.onChanged.addListener((change) => {
    if (!isSessionCookieCleared(change)) {
      return;
    }
    void bootGate
      .run(() => sessionManager.handleSessionExpired())
      .catch((error: unknown) => {
        console.warn("[background] Failed to pause the outbox after sign-out:", error);
      });
  });

  browser.action.onClicked.addListener(async (tab) => {
    try {
      const isChrome = "sidePanel" in browser;

      if (isChrome) {
        await browser.sidePanel.open({ windowId: tab.windowId });
      } else {
        await firefoxBrowser.sidebarAction.open();
      }
    } catch (error) {
      console.warn("[background] Failed to open side panel:", error);
    }
  });

  browser.runtime.onMessageExternal.addListener(handleOnMessageExternalEvents);

  const runBoot = createOutboxBoot({
    repository: outboxRepository,
    scheduler,
    drainer,
    badge,
    runLegacyCleanup,
    restoreRecording: () =>
      restoreRecordingSession({
        lifecycleStore: recordingLifecycleStore,
        recording,
        mirrorStatus: (status) => recordingStatusStore.set(status),
        hasSession: async (sessionId) => Boolean(await outboxRepository.getSession(sessionId)),
      }),
  });
  const hydration = runBoot();
  const bootGate = createBootGate(hydration);

  browser.alarms.onAlarm.addListener(
    createOutboxAlarmListener({
      gate: bootGate,
      handleAlarm: (alarm) => scheduler.handleAlarm(alarm),
    }),
  );
});
