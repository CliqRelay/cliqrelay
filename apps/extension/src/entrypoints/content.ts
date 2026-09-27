import { browser } from "wxt/browser";

import { BridgeMessageTypes, bridgeRequestSchema } from "@repo/data-commons";

import { RUNTIME_MESSAGE_TYPES } from "@/constants/runtime-message-types";
import type { RecordingStatus } from "@/models";
import { createCaptureService } from "@/services/capture";
import { createHighlightOverlay } from "@/services/highlight";
import { recordingStatusStore } from "@/services/recording";
import { isAllowedOrigin } from "@/utils/http";
import { isMessageOfType } from "@/utils/message";

export default defineContentScript({
  matches: ["<all_urls>"],
  main: (ctx) => {
    document.documentElement.dataset.cliqrelayExtension = "true";

    const captureService = createCaptureService(browser.runtime.sendMessage);
    const stopCapture = captureService.start();

    const highlightOverlay = createHighlightOverlay();
    const applyRecordingStatus = (status: RecordingStatus) =>
      status === "recording" ? highlightOverlay.enable() : highlightOverlay.disable();
    void recordingStatusStore.get().then(applyRecordingStatus);
    const unwatchRecordingStatus = recordingStatusStore.watch(applyRecordingStatus);

    ctx.onInvalidated(() => {
      unwatchRecordingStatus();
      highlightOverlay.disable();
      stopCapture();
    });

    browser.runtime.onMessage.addListener((message) => {
      if (isMessageOfType(message, "get_viewport")) {
        return Promise.resolve({
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        });
      }

      if (isMessageOfType(message, RUNTIME_MESSAGE_TYPES.HIGHLIGHT_SUPPRESS)) {
        return highlightOverlay.suppress();
      }

      if (isMessageOfType(message, RUNTIME_MESSAGE_TYPES.HIGHLIGHT_RESTORE)) {
        highlightOverlay.restore();
        return Promise.resolve();
      }
    });

    window.addEventListener("message", async (event) => {
      const result = bridgeRequestSchema.safeParse(event.data);
      if (!result.success) {
        return;
      }

      if (!isAllowedOrigin(event.origin)) {
        console.warn("[cliqrelay] Ignoring postMessage from disallowed origin:", event.origin);
        return;
      }

      const { messageId, payload } = result.data;

      try {
        const response = await browser.runtime.sendMessage(payload);
        window.postMessage(
          { type: BridgeMessageTypes.RESPONSE, messageId, payload: response },
          event.origin,
        );
      } catch (error) {
        window.postMessage(
          {
            type: BridgeMessageTypes.RESPONSE,
            messageId,
            payload: { success: false, error },
          },
          event.origin,
        );
      }
    });
  },
});
