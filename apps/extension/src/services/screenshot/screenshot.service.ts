import type {
  CaptureScreenshotOptions,
  CaptureVisibleTab,
  GetTab,
  ScreenshotResult,
  ScreenshotService,
  SetHighlightSuppressed,
} from "@/models";
import { SCREENSHOT_THROTTLE_MS } from "@/utils/constants";

export type CaptureScreenshot = ReturnType<typeof captureScreenshotFactory>;

export const captureScreenshotFactory = (
  captureVisibleTab: CaptureVisibleTab,
  getTab: GetTab,
  setHighlightSuppressed: SetHighlightSuppressed,
) => {
  return async (
    tabId: number,
    { hideHighlightFirst = false }: CaptureScreenshotOptions = {},
  ): Promise<ScreenshotResult> => {
    const [tab] = await Promise.all([
      getTab(tabId),
      hideHighlightFirst ? setHighlightSuppressed(tabId, true) : undefined,
    ]);

    try {
      const dataUrl = await captureVisibleTab(tab.windowId, {
        format: "png",
      });

      return {
        dataUrl,
        tabId,
        capturedAt: new Date().toISOString(),
      };
    } finally {
      void setHighlightSuppressed(tabId, false);
    }
  };
};

export const createScreenshotService = (captureScreenshot: CaptureScreenshot) => {
  const lastScreenshotTimestamps = new Map<number, number>();

  const captureWithThrottle = async (
    tabId: number,
    options?: CaptureScreenshotOptions,
  ): Promise<string | null> => {
    const now = Date.now();
    const lastTime = lastScreenshotTimestamps.get(tabId) ?? 0;
    if (now - lastTime < SCREENSHOT_THROTTLE_MS) {
      return null;
    }
    lastScreenshotTimestamps.set(tabId, now);

    try {
      const result = await captureScreenshot(tabId, options);
      return result.dataUrl;
    } catch (error) {
      console.warn("[background] Screenshot capture failed:", error);
      return null;
    }
  };

  return { captureWithThrottle };
};

export type { ScreenshotService };
