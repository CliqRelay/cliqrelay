import { browser } from "wxt/browser";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { createBootGate } from "@/background/boot-gate.service";
import { createCaptureHandler } from "@/background/capture-handler";
import { handleOnMessageExternalEvents } from "@/background/external-messages-handler";
import { runLegacyCleanupOnBoot } from "@/background/legacy-cleanup-boot.service";
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
import { db, outboxRepository } from "@/services/outbox";
import { createOutboxApi } from "@/services/outbox/outbox-api.service";
import { createOutboxAuth } from "@/services/outbox/outbox-auth.service";
import { createOutboxBadge } from "@/services/outbox/outbox-badge.service";
import { createOutboxDiagnostics } from "@/services/outbox/outbox-diagnostics.service";
import { createOutboxDrainer } from "@/services/outbox/outbox-drainer.service";
import { createOutboxPusher } from "@/services/outbox/outbox-pusher.service";
import type { OutboxAlarms } from "@/services/outbox/outbox-scheduler.service";
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
import { isSidePanelCommand } from "@/utils/message";

type BrowserAlarms = OutboxAlarms & {
  onAlarm: { addListener: (listener: (alarm: { name: string }) => void) => void };
};

// The `alarms` permission is part of the cleanup half of PR 6. Until it is in
// the manifest the API is absent, so scheduling degrades to wake-up draining.
const alarms = (browser as unknown as { alarms?: BrowserAlarms }).alarms;

if (!alarms) {
  console.warn("[background] alarms permission missing; the outbox drains on wake-ups only");
}

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

  const drainer = createOutboxDrainer({
    repository: outboxRepository,
    pusher,
    auth,
    lifecycleStore: recordingLifecycleStore,
    onStepFailed: () => badge.refresh(),
    onAuthLost: () => sessionManager.handleSessionExpired(),
    onGuideGone: (session) => sessionManager.handleGuideGone(session.id),
    onDrainCompleted: () => scheduler.afterDrain(),
  });

  const scheduler = createOutboxScheduler({
    alarms: alarms ?? { create: async () => {}, clear: async () => false },
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
    if (
      typeof message === "object" &&
      message !== null &&
      (message as Record<string, unknown>).type === RUNTIME_MESSAGE_TYPES.GET_CSRF_TOKEN
    ) {
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

    if (
      typeof message === "object" &&
      message !== null &&
      (message as Record<string, unknown>).type === RUNTIME_MESSAGE_TYPES.GET_ACTIVE_TEAM_ID
    ) {
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

    if (
      isDeveloperBuild &&
      typeof message === "object" &&
      message !== null &&
      (message as Record<string, unknown>).type === RUNTIME_MESSAGE_TYPES.GET_OUTBOX_STATE
    ) {
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
    void bootGate.run(() => sessionManager.handleSessionExpired());
  });

  // Every alarm wake also re-checks for pending work, so a drain that a
  // suspended worker interrupted picks up where it left off.
  alarms?.onAlarm.addListener((alarm) => {
    void bootGate.run(() => scheduler.handleAlarm(alarm));
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

  // Hydration runs last so every listener is registered before boot completes.
  // It clears legacy storage first, then recovers uploads a killed worker left
  // behind, then drains whatever the current user still owns.
  const runBoot = createOutboxBoot({
    repository: outboxRepository,
    scheduler,
    drainer,
    badge,
    runLegacyCleanup: runLegacyCleanupOnBoot,
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
});
