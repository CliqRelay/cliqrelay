import { browser } from "wxt/browser";
import { z } from "zod";

import type {
	CaptureBridgeMessage,
	CaptureMetadataEntry,
	RecordingStateMachine,
} from "@/models";
import type { ScreenshotService } from "@/models/screenshot";
import type { OffscreenManager } from "@/services/background/offscreen-manager.service";
import { NAVIGATION_DEDUP_MS, NAVIGATION_TIMEOUT_MS } from "@/utils/constants";
import { CliqRelayEvents } from "@repo/data-commons";

const urlSchema = z.url();

export type GenerateCaptureId = () => string;

export type NavigationListener = ReturnType<typeof createNavigationListener>;

export const createNavigationListener = (
	recording: RecordingStateMachine,
	screenshotService: ScreenshotService,
	offscreenManager: OffscreenManager,
	captureMetadataMap: Map<string, CaptureMetadataEntry>,
	generateCaptureId: GenerateCaptureId,
) => {
	const dedupMap = new Map<number, { url: string; time: number }>();
	const pendingActivations = new Map<
		number,
		{ capturedAt: string; timeoutId: ReturnType<typeof setTimeout> }
	>();
	const tabOrigins = new Map<number, string>();

	const isRecording = () => recording.getSnapshot().status === "recording";

	const getOrigin = (url: string): string | null => {
		try {
			return new URL(url).origin;
		} catch {
			return null;
		}
	};

	const isDeduped = (tabId: number, url: string): boolean => {
		const entry = dedupMap.get(tabId);
		if (!entry) return false;
		return Date.now() - entry.time < NAVIGATION_DEDUP_MS && url === entry.url;
	};

	const updateDedup = (tabId: number, url: string) => {
		dedupMap.set(tabId, { url, time: Date.now() });
	};

	const getViewportDimensions = async (
		tabId: number,
	): Promise<{ viewportWidth: number; viewportHeight: number } | null> => {
		try {
			const response = await browser.tabs.sendMessage(tabId, {
				type: "get_viewport",
			});
			if (
				response &&
				typeof response.viewportWidth === "number" &&
				typeof response.viewportHeight === "number"
			) {
				return {
					viewportWidth: response.viewportWidth,
					viewportHeight: response.viewportHeight,
				};
			}
		} catch {
			// Content script may not be available
		}
		return null;
	};

	const processNavigation = async (
		tabId: number,
		url: string,
		capturedAt: string,
	) => {
		if (!isRecording()) {
			return;
		}
		if (isDeduped(tabId, url)) {
			return;
		}
		updateDedup(tabId, url);

		const captureId = generateCaptureId();

		const viewportDimensions = await getViewportDimensions(tabId);
		captureMetadataMap.set(captureId, {
			action: "navigation",
			url,
			capturedAt,
			...(viewportDimensions ? { targetElement: viewportDimensions } : {}),
		});

		try {
			const dataUrl = await screenshotService.captureWithThrottle(tabId);
			if (!dataUrl) return;

			const message: CaptureBridgeMessage = {
				source: "background",
				type: CliqRelayEvents.CAPTURE_EVENT,
				payload: {
					action: "navigation",
					url,
					capturedAt,
					captureId,
					tabId: tabId.toString(),
				},
			};

			await offscreenManager.sendJob(captureId, message, dataUrl, tabId);
		} catch (error) {
			console.warn(
				"[navigation-listener] Failed to process navigation:",
				error,
			);
		}
	};

	const clearPendingActivation = (tabId: number) => {
		const pending = pendingActivations.get(tabId);
		if (pending) {
			clearTimeout(pending.timeoutId);
			pendingActivations.delete(tabId);
		}
	};

	const clearPendingActivations = () => {
		for (const [tabId] of pendingActivations) {
			clearPendingActivation(tabId);
		}
	};

	const isActiveTab = async (tabId: number): Promise<boolean> => {
		try {
			const tab = await browser.tabs.get(tabId);
			if (!tab.windowId) return false;
			const tabs = await browser.tabs.query({
				active: true,
				windowId: tab.windowId,
			});
			return tabs.some((t) => t.id === tabId);
		} catch {
			return false;
		}
	};

	const onCompleted = (details: {
		url: string;
		tabId: number;
		frameId: number;
	}) => {
		if (details.frameId !== 0) return;
		void (async () => {
			const active = await isActiveTab(details.tabId);
			if (!active) return;

			const pending = pendingActivations.get(details.tabId);
			if (pending) {
				clearTimeout(pending.timeoutId);
				pendingActivations.delete(details.tabId);
				void processNavigation(details.tabId, details.url, pending.capturedAt);
				return;
			}

			const newOrigin = getOrigin(details.url);
			const previousOrigin = tabOrigins.get(details.tabId);
			tabOrigins.set(details.tabId, newOrigin ?? "");

			if (newOrigin && previousOrigin && newOrigin === previousOrigin) {
				return;
			}

			void processNavigation(
				details.tabId,
				details.url,
				new Date().toISOString(),
			);
		})();
	};

	const onActivated = async (activeInfo: {
		tabId: number;
		windowId: number;
	}) => {
		if (!isRecording()) return;
		try {
			const tab = await browser.tabs.get(activeInfo.tabId);
			if (tab.status === "complete") {
				if (!tab.url) return;
				const parsed = urlSchema.safeParse(tab.url);
				if (!parsed.success) return;
				void processNavigation(
					activeInfo.tabId,
					parsed.data,
					new Date().toISOString(),
				);
			} else {
				const capturedAt = new Date().toISOString();
				const timeoutId = setTimeout(async () => {
					try {
						const currentTab = await browser.tabs.get(activeInfo.tabId);
						if (currentTab.url) {
							void processNavigation(
								activeInfo.tabId,
								currentTab.url,
								capturedAt,
							);
						}
					} catch {
						// Tab may have been closed
					}
					pendingActivations.delete(activeInfo.tabId);
				}, NAVIGATION_TIMEOUT_MS);
				pendingActivations.set(activeInfo.tabId, { capturedAt, timeoutId });
			}
		} catch {
			// Tab may have been closed
		}
	};

	const onErrorOccurred = (details: {
		tabId: number;
		frameId: number;
		error: string;
	}) => {
		if (details.frameId !== 0) return;
		clearPendingActivation(details.tabId);
	};

	const onRemoved = (tabId: number) => {
		clearPendingActivation(tabId);
		tabOrigins.delete(tabId);
	};

	const start = () => {
		browser.webNavigation.onCompleted.addListener(onCompleted);
		browser.tabs.onActivated.addListener(onActivated);
		browser.webNavigation.onErrorOccurred.addListener(onErrorOccurred);
		browser.tabs.onRemoved.addListener(onRemoved);

		return {
			stop: () => {
				browser.webNavigation.onCompleted.removeListener(onCompleted);
				browser.tabs.onActivated.removeListener(onActivated);
				browser.webNavigation.onErrorOccurred.removeListener(onErrorOccurred);
				browser.tabs.onRemoved.removeListener(onRemoved);
				clearPendingActivations();
			},
			clearDedup: () => {
				dedupMap.clear();
				tabOrigins.clear();
			},
			clearPendingActivations: () => {
				clearPendingActivations();
			},
		};
	};

	return { start };
};
