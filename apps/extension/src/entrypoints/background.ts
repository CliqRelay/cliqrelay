import { browser } from "wxt/browser";

import { createCaptureHandler } from "@/background/capture-handler";
import { handleOnMessageExternalEvents } from "@/background/external-messages-handler";
import { createSessionManager } from "@/background/session-manager";
import { firefoxBrowser } from "@/constants/firefox-browser";
import { SIDEPANEL_PORT_NAME } from "@/models/sidepanel";
import { createNavigationListener } from "@/services/background";
import { createRecordingStateMachine } from "@/services/recording";
import { screenshotService } from "@/services/screenshot";
import { sessionService } from "@/services/session";
import { getSettings, updateSettings } from "@/services/settings";
import { createPortManager } from "@/services/sidepanel/port-manager.service";
import { generateCaptureId } from "@/utils/id";
import { isOffscreenEvent, isSidePanelCommand } from "@/utils/message";

export default defineBackground(() => {
	const recording = createRecordingStateMachine("idle");

	const sessionManager = createSessionManager(
		recording,
		sessionService,
		getSettings,
		updateSettings,
	);

	const { stateUpdateBuilder } = sessionManager;

	const portManager = createPortManager(async () => {
		return await stateUpdateBuilder();
	});

	sessionManager.setPortManager(portManager);

	const captureHandler = createCaptureHandler(
		screenshotService,
		sessionManager.offscreenManager,
		recording,
		stateUpdateBuilder,
		portManager,
		sessionManager.captureMetadataMap,
		sessionManager.handleFreeTypingCapture,
		sessionManager.clearPendingFreeTyping,
	);

	recording.setProcessBufferedCapture(async (captures) => {
		for (const capture of captures) {
			try {
				const dataUrl = await screenshotService.captureWithThrottle(
					capture.tabId,
				);
				if (!dataUrl) continue;
				await sessionManager.offscreenManager.sendJob(
					capture.message.payload.captureId!,
					capture.message,
					dataUrl,
					capture.tabId,
				);
			} catch (error) {
				console.warn("[background] Failed to process buffered capture:", error);
			}
		}
		const stateUpdate = await stateUpdateBuilder();
		portManager.broadcast({ type: "state_update", state: stateUpdate });
	});

	const navigationListener = createNavigationListener(
		recording,
		screenshotService,
		sessionManager.offscreenManager,
		sessionManager.captureMetadataMap,
		generateCaptureId,
	);

	const { clearDedup, clearPendingActivations } = navigationListener.start();
	sessionManager.setClearDedup(clearDedup);
	sessionManager.setClearPendingActivations(clearPendingActivations);

	browser.runtime.onMessage.addListener(
		(message: unknown, sender, sendResponse) => {
			if (captureHandler.handleCapture(message, sender)) {
				return;
			}

			if (isSidePanelCommand(message)) {
				return sessionManager.handleSidePanelCommand(message);
			}

			if (isOffscreenEvent(message)) {
				void sessionManager.handleOffscreenEvent(message);
			}

			if (
				typeof message === "object" &&
				message !== null &&
				"action" in message
			) {
				return handleOnMessageExternalEvents(message, sender, sendResponse);
			}
		},
	);

	browser.runtime.onConnect.addListener((port) => {
		if (port.name !== SIDEPANEL_PORT_NAME) {
			return;
		}
		portManager.registerPort(port);
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
});
