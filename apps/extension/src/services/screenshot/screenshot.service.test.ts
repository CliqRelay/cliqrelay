import { describe, expect, test, vi } from "vitest";

import { captureScreenshotFactory } from "./screenshot.service";

describe("screenshot service", () => {
	test("captures visible tab and returns screenshot result", async () => {
		const captureVisibleTab = vi
			.fn()
			.mockResolvedValue("data:image/png;base64,abc123");
		const getTab = vi.fn().mockResolvedValue({ windowId: 42 });

		const service = captureScreenshotFactory(captureVisibleTab, getTab);
		const result = await service(1);

		expect(getTab).toHaveBeenCalledWith(1);
		expect(captureVisibleTab).toHaveBeenCalledWith(42, { format: "png" });
		expect(result.dataUrl).toBe("data:image/png;base64,abc123");
		expect(result.tabId).toBe(1);
		expect(result.capturedAt).toBeDefined();
	});

	test("rejects when captureVisibleTab fails", async () => {
		const captureVisibleTab = vi
			.fn()
			.mockRejectedValue(new Error("permission denied"));
		const getTab = vi.fn().mockResolvedValue({ windowId: 42 });

		const service = captureScreenshotFactory(captureVisibleTab, getTab);
		await expect(service(1)).rejects.toThrow("permission denied");
	});

	test("rejects when getTab fails", async () => {
		const captureVisibleTab = vi.fn();
		const getTab = vi.fn().mockRejectedValue(new Error("tab not found"));

		const service = captureScreenshotFactory(captureVisibleTab, getTab);
		await expect(service(99)).rejects.toThrow("tab not found");
	});
});
