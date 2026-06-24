import { browser } from "wxt/browser";

import { createCaptureService } from "@/services/capture";

export default defineContentScript({
	matches: ["<all_urls>"],
	main: () => {
		const captureService = createCaptureService(browser.runtime.sendMessage);
		captureService.start();

		browser.runtime.onMessage.addListener((message) => {
			if (message && typeof message === "object" && "type" in message && message.type === "get_viewport") {
				return Promise.resolve({
					viewportWidth: window.innerWidth,
					viewportHeight: window.innerHeight,
				});
			}
		});
	},
});
