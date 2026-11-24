import { describe, expect, test, vi } from "vitest";

import { CliqRelayEvents } from "@repo/data-commons";

import { createCaptureHandler } from "./capture-handler";
import type { RecordingStateMachine } from "@/models";
import { createRecordingStateMachine } from "@/services/recording/recording.service";

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

const typingMessage = {
  source: "content-script" as const,
  type: CliqRelayEvents.CAPTURE_EVENT,
  payload: {
    action: "input" as const,
    url: "https://angular.dev",
    capturedAt: "2026-09-28T12:00:00.000Z",
    typedText: "hello",
    typingSessionId: "typing-1",
  },
};

const setup = (recording: RecordingStateMachine = createRecordingStateMachine("recording")) => {
  const writer = {
    writeCapture: vi.fn().mockResolvedValue(null),
    writeTyping: vi.fn().mockResolvedValue(null),
    writeNavigation: vi.fn().mockResolvedValue(null),
  };
  const onStateChanged = vi.fn().mockResolvedValue(undefined);

  const { handleCapture } = createCaptureHandler({ writer, recording, onStateChanged });

  return { handleCapture, writer, onStateChanged };
};

describe("capture handler", () => {
  describe("handleCapture", () => {
    test("writes a click through the local outbox writer", async () => {
      const { handleCapture, writer, onStateChanged } = setup();

      handleCapture(clickMessage, { tab: { id: TAB_ID } } as never);

      await vi.waitFor(() => expect(onStateChanged).toHaveBeenCalled());
      expect(writer.writeCapture).toHaveBeenCalledTimes(1);
      expect(writer.writeCapture).toHaveBeenCalledWith(clickMessage, TAB_ID);
      expect(writer.writeTyping).not.toHaveBeenCalled();
    });

    test("writes free typing through the typing upsert path", async () => {
      const { handleCapture, writer } = setup();

      handleCapture(typingMessage, { tab: { id: TAB_ID } } as never);

      await vi.waitFor(() => expect(writer.writeTyping).toHaveBeenCalled());
      expect(writer.writeTyping).toHaveBeenCalledWith(typingMessage);
      expect(writer.writeCapture).not.toHaveBeenCalled();
    });

    test("does not write when recording is paused", () => {
      const { handleCapture, writer } = setup(createRecordingStateMachine("paused"));

      handleCapture(clickMessage, { tab: { id: TAB_ID } } as never);

      expect(writer.writeCapture).not.toHaveBeenCalled();
      expect(writer.writeTyping).not.toHaveBeenCalled();
    });

    test("warns at most once when captures arrive without a recording session", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { handleCapture, writer } = setup(createRecordingStateMachine("idle"));

      handleCapture(clickMessage, { tab: { id: TAB_ID } } as never);
      handleCapture(clickMessage, { tab: { id: TAB_ID } } as never);

      expect(writer.writeCapture).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith("[background] Dropped capture: status=idle action=click");

      warn.mockRestore();
    });
  });
});
