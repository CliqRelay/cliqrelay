import type { Browser } from "wxt/browser";

import type { RecordingStateMachine } from "@/models";
import type { OutboxWriter } from "@/services/outbox/outbox-writer.service";
import { createDroppedCaptureReporter } from "@/utils/diagnostics";
import { isCaptureBridgeMessage } from "@/utils/message";

type CaptureHandlerDeps = {
  writer: OutboxWriter;
  recording: RecordingStateMachine;
  onStateChanged?: () => void | Promise<void>;
};

export const createCaptureHandler = ({ writer, recording, onStateChanged }: CaptureHandlerDeps) => {
  const reportDroppedCapture = createDroppedCaptureReporter();

  const handleCapture = (message: unknown, sender: Browser.runtime.MessageSender) => {
    if (!isCaptureBridgeMessage(message)) {
      return false;
    }

    const tabId = sender.tab?.id;
    if (tabId == null) {
      return true;
    }

    const { status } = recording.getSnapshot();
    if (status !== "recording") {
      reportDroppedCapture(`status=${status} action=${message.payload.action}`);
      return true;
    }

    const isTyping = message.payload.action === "input" && message.payload.typedText != null;
    const write = isTyping ? writer.writeTyping(message) : writer.writeCapture(message, tabId);

    void write
      .catch((error) => {
        console.warn("[background] Local capture write failed:", error);
      })
      .finally(() => {
        void onStateChanged?.();
      });

    return true;
  };

  return { handleCapture };
};

export type CaptureHandler = ReturnType<typeof createCaptureHandler>;
