import { describe, expect, test, vi } from "vitest";

import { captureScreenshotFactory, createScreenshotService } from "./screenshot.service";

describe("screenshot service", () => {
  test("captures visible tab and returns screenshot result", async () => {
    const captureVisibleTab = vi.fn().mockResolvedValue("data:image/png;base64,abc123");
    const getTab = vi.fn().mockResolvedValue({ windowId: 42 });

    const service = captureScreenshotFactory(
      captureVisibleTab,
      getTab,
      vi.fn().mockResolvedValue(undefined),
    );
    const result = await service(1);

    expect(getTab).toHaveBeenCalledWith(1);
    expect(captureVisibleTab).toHaveBeenCalledWith(42, { format: "png" });
    expect(result.dataUrl).toBe("data:image/png;base64,abc123");
    expect(result.tabId).toBe(1);
    expect(result.capturedAt).toBeDefined();
  });

  test("rejects when captureVisibleTab fails", async () => {
    const captureVisibleTab = vi.fn().mockRejectedValue(new Error("permission denied"));
    const getTab = vi.fn().mockResolvedValue({ windowId: 42 });

    const service = captureScreenshotFactory(
      captureVisibleTab,
      getTab,
      vi.fn().mockResolvedValue(undefined),
    );
    await expect(service(1)).rejects.toThrow("permission denied");
  });

  test("rejects when getTab fails", async () => {
    const captureVisibleTab = vi.fn();
    const getTab = vi.fn().mockRejectedValue(new Error("tab not found"));

    const service = captureScreenshotFactory(
      captureVisibleTab,
      getTab,
      vi.fn().mockResolvedValue(undefined),
    );
    await expect(service(99)).rejects.toThrow("tab not found");
  });

  test("hides the highlight before capturing and restores it after", async () => {
    const calls: string[] = [];
    const setHighlightSuppressed = vi.fn(async (_tabId: number, suppressed: boolean) => {
      calls.push(suppressed ? "suppress" : "restore");
    });
    const captureVisibleTab = vi.fn(async () => {
      calls.push("capture");
      return "data:image/png;base64,abc123";
    });
    const getTab = vi.fn().mockResolvedValue({ windowId: 42 });

    await captureScreenshotFactory(captureVisibleTab, getTab, setHighlightSuppressed)(7);

    expect(calls).toEqual(["suppress", "capture", "restore"]);
    expect(setHighlightSuppressed).toHaveBeenNthCalledWith(1, 7, true);
    expect(setHighlightSuppressed).toHaveBeenNthCalledWith(2, 7, false);
  });

  test("restores the highlight when capture fails", async () => {
    const setHighlightSuppressed = vi.fn().mockResolvedValue(undefined);
    const captureVisibleTab = vi.fn().mockRejectedValue(new Error("permission denied"));
    const getTab = vi.fn().mockResolvedValue({ windowId: 42 });

    const capture = captureScreenshotFactory(captureVisibleTab, getTab, setHighlightSuppressed);

    await expect(capture(1)).rejects.toThrow("permission denied");
    expect(setHighlightSuppressed).toHaveBeenLastCalledWith(1, false);
  });

  test("does not touch the highlight for throttled captures", async () => {
    const setHighlightSuppressed = vi.fn().mockResolvedValue(undefined);
    const capture = captureScreenshotFactory(
      vi.fn().mockResolvedValue("data:image/png;base64,abc123"),
      vi.fn().mockResolvedValue({ windowId: 42 }),
      setHighlightSuppressed,
    );
    const service = createScreenshotService(capture);

    await service.captureWithThrottle(1);
    setHighlightSuppressed.mockClear();
    const result = await service.captureWithThrottle(1);

    expect(result).toBeNull();
    expect(setHighlightSuppressed).not.toHaveBeenCalled();
  });
});
