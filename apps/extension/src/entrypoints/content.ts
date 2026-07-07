import { browser } from "wxt/browser";

import { BridgeMessageTypes, bridgeRequestSchema } from "@repo/data-commons";

import { createCaptureService } from "@/services/capture";
import { isAllowedOrigin } from "@/utils/http";

export default defineContentScript({
	matches: ["<all_urls>"],
	main: () => {
		document.documentElement.dataset.cliqrelayExtension = "true";

		const captureService = createCaptureService(browser.runtime.sendMessage);
		captureService.start();

		browser.runtime.onMessage.addListener((message) => {
			if (
				message &&
				typeof message === "object" &&
				"type" in message &&
				message.type === "get_viewport"
			) {
				return Promise.resolve({
					viewportWidth: window.innerWidth,
					viewportHeight: window.innerHeight,
				});
			}
		});

		window.addEventListener("message", async (event) => {
			const result = bridgeRequestSchema.safeParse(event.data);
			if (!result.success) {
				return;
			}

			if (!isAllowedOrigin(event.origin)) {
				console.warn(
					"[cliqrelay] Ignoring postMessage from disallowed origin:",
					event.origin,
				);
				return;
			}

			const { messageId, payload } = result.data;

			try {
				const response = await browser.runtime.sendMessage(payload);
				window.postMessage(
					{ type: BridgeMessageTypes.RESPONSE, messageId, payload: response },
					event.origin,
				);
			} catch (error) {
				window.postMessage(
					{
						type: BridgeMessageTypes.RESPONSE,
						messageId,
						payload: { success: false, error },
					},
					event.origin,
				);
			}
		});
	},
});
