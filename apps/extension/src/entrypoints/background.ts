import { browser } from "wxt/browser";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { createBootGate } from "@/background/boot-gate.service";
import { createCaptureHandler } from "@/background/capture-handler";
import { handleOnMessageExternalEvents } from "@/background/external-messages-handler";
import { restoreRecordingSession } from "@/background/recording-boot.service";
import { createSessionManager } from "@/background/session-manager";
import { env } from "@/constants/env";
import { firefoxBrowser } from "@/constants/firefox-browser";
import { RUNTIME_MESSAGE_TYPES } from "@/constants/runtime-message-types";
import { isSessionCookieCleared } from "@/lib/auth-session";
import type { RecordingStatus } from "@/models";
import { SIDEPANEL_PORT_NAME } from "@/models/sidepanel";
import { createNavigationListener } from "@/services/background";
import { outboxRepository } from "@/services/outbox";
import { createOutboxWriter } from "@/services/outbox/outbox-writer.service";
import {
  createRecordingLifecycleStore,
  createRecordingStateMachine,
  recordingStatusStore,
} from "@/services/recording";
import { screenshotService } from "@/services/screenshot";
import { getSettings, updateSettings } from "@/services/settings";
import { createPortManager } from "@/services/sidepanel/port-manager.service";
import { isSidePanelCommand } from "@/utils/message";

export default defineBackground(() => {
  const recordingLifecycleStore = createRecordingLifecycleStore(browser.storage.session);

  const mirrorRecordingStatus = (status: RecordingStatus) => {
    void recordingStatusStore.set(status).catch(() => {});
  };
  const recording = createRecordingStateMachine("idle", mirrorRecordingStatus);

  const sessionManager = createSessionManager(
    recording,
    recordingLifecycleStore,
    outboxRepository,
    getSettings,
    updateSettings,
  );

  const { stateUpdateBuilder, broadcastUpdate } = sessionManager;

  const portManager = createPortManager(async () => {
    return await stateUpdateBuilder();
  });

  sessionManager.setPortManager(portManager);

  const outboxWriter = createOutboxWriter({
    repository: outboxRepository,
    lifecycleStore: recordingLifecycleStore,
    screenshotService,
  });

  const captureHandler = createCaptureHandler({
    writer: outboxWriter,
    recording,
    onStateChanged: () => broadcastUpdate(),
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
    void sessionManager.handleSessionExpired();
  });

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDEPANEL_PORT_NAME) {
      return;
    }
    void panelGate.run(() => portManager.registerPort(port));
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

  // Hydration is started last so every listener is registered before boot
  // completes. Captures wait for the local lifecycle restore; the panel also
  // waits for the synced step history so its first paint is complete.
  const hydration = restoreRecordingSession({
    lifecycleStore: recordingLifecycleStore,
    recording,
    mirrorStatus: (status) => recordingStatusStore.set(status),
    hasSession: async (sessionId) => Boolean(await outboxRepository.getSession(sessionId)),
  });
  const bootGate = createBootGate(hydration);
  const panelGate = createBootGate(
    hydration.then(async (status) => {
      if (status === "recording" || status === "paused") {
        await sessionManager.restoreProgress();
      }
    }),
  );
});
