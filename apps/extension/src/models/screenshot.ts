export type ScreenshotResult = {
	dataUrl: string;
	tabId: number;
	capturedAt: string;
};

export type CaptureVisibleTab = (
	windowId: number,
	options?: { format?: "png" | "jpeg"; quality?: number },
) => Promise<string>;

export type GetTab = (tabId: number) => Promise<{ windowId: number }>;

export type ScreenshotService = {
	captureWithThrottle: (tabId: number) => Promise<string | null>;
};
