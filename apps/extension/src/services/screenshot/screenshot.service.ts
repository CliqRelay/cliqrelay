import type {
	CaptureVisibleTab,
	GetTab,
	ScreenshotResult,
	ScreenshotService,
} from "@/models";
import { SCREENSHOT_THROTTLE_MS } from "@/utils/constants";

export type CaptureScreenshot = ReturnType<typeof captureScreenshotFactory>;

export const captureScreenshotFactory = (
	captureVisibleTab: CaptureVisibleTab,
	getTab: GetTab,
) => {
	return async (tabId: number): Promise<ScreenshotResult> => {
		const tab = await getTab(tabId);
		const dataUrl = await captureVisibleTab(tab.windowId, {
			format: "png",
		});

		return {
			dataUrl,
			tabId,
			capturedAt: new Date().toISOString(),
		};
	};
};

export const createScreenshotService = (
	captureScreenshot: CaptureScreenshot,
) => {
	const lastScreenshotTimestamps = new Map<number, number>();

	const captureWithThrottle = async (
		tabId: number,
	): Promise<string | null> => {
		const now = Date.now();
		const lastTime = lastScreenshotTimestamps.get(tabId) ?? 0;
		if (now - lastTime < SCREENSHOT_THROTTLE_MS) {
			return null;
		}
		lastScreenshotTimestamps.set(tabId, now);

		try {
			const result = await captureScreenshot(tabId);
			return result.dataUrl;
		} catch (error) {
			console.warn("[background] Screenshot capture failed:", error);
			return null;
		}
	};

	return { captureWithThrottle };
};

export type { ScreenshotService };
