import { browser } from "wxt/browser";

import {
	captureScreenshotFactory,
	createScreenshotService,
} from "./screenshot.service";

export const captureScreenshot = captureScreenshotFactory(
	(windowId, options) =>
		browser.tabs.captureVisibleTab(windowId, options as any),
	(tabId) => browser.tabs.get(tabId),
);

export const screenshotService = createScreenshotService(captureScreenshot);

export type {
	CaptureScreenshot,
	ScreenshotService,
} from "./screenshot.service";
