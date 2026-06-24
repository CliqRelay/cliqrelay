import { type Browser } from "wxt/browser";

import type { PortManager } from "@/services/sidepanel/port-manager.service";
import type { OffscreenManager } from "@/services/background/offscreen-manager.service";
import type {
	CaptureMetadataEntry,
	RecordingStateMachine,
	ScreenshotService,
	SidePanelStateUpdate,
} from "@/models";
import { buildActionText } from "@/utils/action-text";
import { generateCaptureId } from "@/utils/id";
import { isCaptureBridgeMessage } from "@/utils/message";

export const createCaptureHandler = (
	screenshotService: ScreenshotService,
	offscreenManager: OffscreenManager,
	recording: RecordingStateMachine,
	stateUpdateBuilder: () => Promise<SidePanelStateUpdate>,
	portManager: PortManager,
	captureMetadataMap: Map<string, CaptureMetadataEntry>,
) => {
	const handleCapture = (
		message: unknown,
		sender: Browser.runtime.MessageSender,
	) => {
		if (!isCaptureBridgeMessage(message)) {
			return false;
		}

		const tabId = sender.tab?.id;
		if (tabId == null) {
			return true;
		}

		if (recording.getSnapshot().status !== "recording") {
			return true;
		}

		const captureId = generateCaptureId();
		const targetElement = message.payload.targetElement;
		captureMetadataMap.set(captureId, {
			action: message.payload.action,
			actionText: buildActionText(
				message.payload.action,
				message.payload.targetElement,
			),
			url: message.payload.url,
			capturedAt: message.payload.capturedAt,
			...(targetElement
				? {
						targetElement: {
							clickX: targetElement.clickX,
							clickY: targetElement.clickY,
							viewportWidth: targetElement.viewportWidth,
							viewportHeight: targetElement.viewportHeight,
						},
					}
				: {}),
		});

		recording.ingestCapture({
			tabId,
			message: {
				source: "background",
				type: message.type,
				payload: { ...message.payload, captureId, tabId: tabId.toString() },
			},
		});

		const processCapture = async () => {
			try {
				const capturedDataUrl =
					await screenshotService.captureWithThrottle(tabId);
				if (!capturedDataUrl) {
					return;
				}

				await offscreenManager.sendJob(
					captureId,
					message,
					capturedDataUrl,
					tabId,
				);
			} catch (error) {
				console.warn("[background] Capture processing failed:", error);
			}

			const stateUpdate = await stateUpdateBuilder();
			portManager.broadcast({ type: "state_update", state: stateUpdate });
		};

		void processCapture();
		return true;
	};

	return { handleCapture };
};

export type CaptureHandler = ReturnType<typeof createCaptureHandler>;
