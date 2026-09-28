import { describe, expect, test, vi } from "vitest";

import { CliqRelayEvents } from "@repo/data-commons";

import { createCaptureHandler } from "./capture-handler";
import type { RecordingStateMachine, SidePanelStateUpdate } from "@/models";
import type { OffscreenManager } from "@/services/background/offscreen-manager.service";
import { createRecordingStateMachine } from "@/services/recording/recording.service";
import type { PortManager } from "@/services/sidepanel/port-manager.service";

const TAB_ID = 5;

const clickMessage = {
  source: "content-script" as const,
  type: CliqRelayEvents.CAPTURE_EVENT,
  payload: {
    action: "click" as const,
    url: "https://angular.dev",
    capturedAt: "2026-09-28T12:00:00.000Z",
  },
};

const setup = (recording: RecordingStateMachine = createRecordingStateMachine("recording")) => {
  const screenshotService = {
    captureWithThrottle: vi.fn().mockResolvedValue("data:image/png;base64,abc123"),
  };
  const offscreenManager = { sendJob: vi.fn().mockResolvedValue(undefined) };
  const portManager = { broadcast: vi.fn() };

  const { handleCapture } = createCaptureHandler(
    screenshotService,
    offscreenManager as unknown as OffscreenManager,
    recording,
    vi.fn().mockResolvedValue({} as SidePanelStateUpdate),
    portManager as unknown as PortManager,
    new Map(),
    vi.fn().mockResolvedValue(undefined),
    vi.fn(),
  );

  return { handleCapture, screenshotService, offscreenManager };
};

describe("capture handler", () => {
  describe("handleCapture", () => {
    test("should screenshot a click without asking the tab to hide the highlight first", async () => {
      const { handleCapture, screenshotService, offscreenManager } = setup();

      handleCapture(clickMessage, { tab: { id: TAB_ID } } as never);

      await vi.waitFor(() => expect(offscreenManager.sendJob).toHaveBeenCalled());
      // Waiting on the tab delays the capture until the page has reacted to the click,
      // so transient UI such as cookie banners disappears from the screenshot.
      expect(screenshotService.captureWithThrottle).toHaveBeenCalledTimes(1);
      expect(screenshotService.captureWithThrottle.mock.calls[0]).toEqual([TAB_ID]);
    });

    test("should not screenshot when recording is paused", () => {
      const { handleCapture, screenshotService } = setup(createRecordingStateMachine("paused"));

      handleCapture(clickMessage, { tab: { id: TAB_ID } } as never);

      expect(screenshotService.captureWithThrottle).not.toHaveBeenCalled();
    });
  });
});
