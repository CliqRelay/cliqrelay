import { browser } from "wxt/browser";

import { captureScreenshotFactory, createScreenshotService } from "./screenshot.service";
import { RUNTIME_MESSAGE_TYPES } from "@/constants/runtime-message-types";
import type { SetHighlightSuppressed } from "@/models";
import { HIGHLIGHT_SUPPRESS_TIMEOUT_MS } from "@/utils/constants";

const setHighlightSuppressed: SetHighlightSuppressed = (tabId, suppressed) =>
  Promise.race([
    browser.tabs.sendMessage(tabId, {
      type: suppressed
        ? RUNTIME_MESSAGE_TYPES.HIGHLIGHT_SUPPRESS
        : RUNTIME_MESSAGE_TYPES.HIGHLIGHT_RESTORE,
    }),
    new Promise((resolve) => setTimeout(resolve, HIGHLIGHT_SUPPRESS_TIMEOUT_MS)),
  ]).then(
    () => undefined,
    () => undefined,
  );

export const captureScreenshot = captureScreenshotFactory(
  (windowId, options) => browser.tabs.captureVisibleTab(windowId, options as any),
  (tabId) => browser.tabs.get(tabId),
  setHighlightSuppressed,
);

export const screenshotService = createScreenshotService(captureScreenshot);

export type { CaptureScreenshot, ScreenshotService } from "./screenshot.service";
