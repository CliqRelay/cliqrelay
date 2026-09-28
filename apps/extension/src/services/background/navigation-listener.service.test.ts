import { beforeEach, describe, expect, test, vi } from "vitest";

import { createNavigationListener } from "./navigation-listener.service";
import type { OffscreenManager } from "@/services/background/offscreen-manager.service";
import { createRecordingStateMachine } from "@/services/recording/recording.service";

const TAB_ID = 5;

type OnCompleted = (details: { url: string; tabId: number; frameId: number }) => void;

const { browserMock } = vi.hoisted(() => {
  const listener = () => ({ addListener: vi.fn(), removeListener: vi.fn() });
  return {
    browserMock: {
      tabs: {
        get: vi.fn(),
        query: vi.fn(),
        sendMessage: vi.fn(),
        onActivated: listener(),
        onRemoved: listener(),
      },
      webNavigation: {
        onCompleted: listener(),
        onErrorOccurred: listener(),
      },
    },
  };
});

vi.mock("wxt/browser", () => ({ browser: browserMock }));

describe("navigation listener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserMock.tabs.get.mockResolvedValue({ id: TAB_ID, windowId: 1 });
    browserMock.tabs.query.mockResolvedValue([{ id: TAB_ID }]);
    browserMock.tabs.sendMessage.mockResolvedValue({ viewportWidth: 1280, viewportHeight: 720 });
  });

  describe("onCompleted", () => {
    test("should hide the highlight before screenshotting a loaded page", async () => {
      const screenshotService = {
        captureWithThrottle: vi.fn().mockResolvedValue("data:image/png;base64,abc123"),
      };
      const offscreenManager = { sendJob: vi.fn().mockResolvedValue(undefined) };
      createNavigationListener(
        createRecordingStateMachine("recording"),
        screenshotService,
        offscreenManager as unknown as OffscreenManager,
        new Map(),
        () => "capture_1",
      ).start();
      const [[onCompleted]] = browserMock.webNavigation.onCompleted.addListener.mock
        .calls as unknown as [[OnCompleted]];

      onCompleted({ url: "https://angular.dev", tabId: TAB_ID, frameId: 0 });

      await vi.waitFor(() =>
        expect(screenshotService.captureWithThrottle).toHaveBeenCalledWith(TAB_ID, {
          hideHighlightFirst: true,
        }),
      );
    });
  });
});
