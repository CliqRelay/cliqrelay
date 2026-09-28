// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { RUNTIME_MESSAGE_TYPES } from "@/constants/runtime-message-types";
import type { RecordingStatus } from "@/models";

const startMock = vi.fn();
const stopCaptureMock = vi.fn();
const addMessageListenerMock = vi.fn();
const unwatchMock = vi.fn();
const overlayMock = {
  enable: vi.fn(),
  disable: vi.fn(),
  suppress: vi.fn().mockResolvedValue(undefined),
  restore: vi.fn(),
};
const statusStoreMock = {
  get: vi.fn<() => Promise<RecordingStatus>>(),
  set: vi.fn(),
  watch: vi.fn(() => unwatchMock),
};

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: {
        addListener: addMessageListenerMock,
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

vi.mock("@/services/highlight", () => ({
  createHighlightOverlay: vi.fn(() => overlayMock),
}));

vi.mock("@/services/recording", () => ({
  recordingStatusStore: statusStoreMock,
}));

const ctx = { onInvalidated: vi.fn() };

const loadContentScript = async () => {
  vi.resetModules();
  await import("@/entrypoints/content");
  await Promise.resolve();
};

const getMessageListener = () =>
  addMessageListenerMock.mock.calls[0]?.[0] as (message: unknown) => unknown;

describe("content script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startMock.mockReturnValue(stopCaptureMock);
    statusStoreMock.get.mockResolvedValue("idle");
    vi.stubGlobal(
      "defineContentScript",
      vi.fn((config: { main: (context: typeof ctx) => void }) => {
        config.main(ctx);
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

  test("enables the highlight overlay while recording", async () => {
    statusStoreMock.get.mockResolvedValue("recording");

    await loadContentScript();

    expect(overlayMock.enable).toHaveBeenCalledTimes(1);
  });

  test("disables the highlight overlay when recording is paused", async () => {
    await loadContentScript();
    const [[onStatusChange]] = statusStoreMock.watch.mock.calls as unknown as [
      [(status: RecordingStatus) => void],
    ];

    onStatusChange("paused");

    expect(overlayMock.disable).toHaveBeenCalled();
  });

  test("routes highlight suppress and restore messages to the overlay", async () => {
    await loadContentScript();
    const listener = getMessageListener();

    await listener({ type: RUNTIME_MESSAGE_TYPES.HIGHLIGHT_SUPPRESS });
    await listener({ type: RUNTIME_MESSAGE_TYPES.HIGHLIGHT_RESTORE });

    expect(overlayMock.suppress).toHaveBeenCalledTimes(1);
    expect(overlayMock.restore).toHaveBeenCalledTimes(1);
  });

  test("cleans up when the content script is invalidated", async () => {
    await loadContentScript();
    const [[onInvalidated]] = ctx.onInvalidated.mock.calls as unknown as [[() => void]];

    onInvalidated();

    expect(unwatchMock).toHaveBeenCalled();
    expect(overlayMock.disable).toHaveBeenCalled();
    expect(stopCaptureMock).toHaveBeenCalled();
  });
});
