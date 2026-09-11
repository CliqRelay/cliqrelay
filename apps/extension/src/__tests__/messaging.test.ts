// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const startMock = vi.fn();

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: vi.fn(),
      },
    },
    storage: {
      local: vi.fn(),
    },
  },
}));

vi.mock("@/services/capture", () => ({
  createCaptureService: vi.fn(() => ({
    start: startMock,
  })),
}));

const loadContentScript = async () => {
  vi.resetModules();
  await import("@/entrypoints/content");
};

describe("content script", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "defineContentScript",
      vi.fn((config: { main: () => void }) => {
        config.main();
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("creates capture service and starts it", async () => {
    await loadContentScript();

    expect(startMock).toHaveBeenCalledTimes(1);
  });
});
