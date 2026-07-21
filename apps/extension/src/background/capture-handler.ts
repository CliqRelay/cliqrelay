import type { Browser } from "wxt/browser";

import type { CreateStepWithoutScreenshot } from "@/models";
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
	createStepWithoutScreenshot: CreateStepWithoutScreenshot,
	clearPendingFreeTyping: () => void,
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
		const payload = message.payload;
		const targetElement = payload.targetElement;
		const actionText = buildActionText(
			payload.action,
			payload.targetElement,
			payload.typedText,
			payload.keyCombo,
		);

		captureMetadataMap.set(captureId, {
			action: payload.action,
			actionText,
			url: payload.url,
			capturedAt: payload.capturedAt,
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

		const isFreeTyping = payload.action === "input" && payload.typedText;

		if (isFreeTyping) {
			void (async () => {
				try {
					await createStepWithoutScreenshot(captureId, message);
				} catch (error) {
					console.warn("[background] Free typing step creation failed:", error);
				}
				const stateUpdate = await stateUpdateBuilder();
				portManager.broadcast({ type: "state_update", state: stateUpdate });
			})();
			return true;
		}

		clearPendingFreeTyping();

		recording.ingestCapture({
			tabId,
			message: {
				source: "background",
				type: message.type,
				payload: { ...payload, captureId, tabId: tabId.toString() },
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
