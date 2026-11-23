import { browser } from "wxt/browser";

import type { CaptureBridgeMessage } from "@/models";
import type { OffscreenCommand, OffscreenEvent } from "@/models/offscreen";
import { createOffscreenRuntime } from "@/services/offscreen/offscreen-runtime.service";
import { getChromeOffscreen } from "@/utils/message";

export type OffscreenManager = ReturnType<typeof createOffscreenManager>;

export const createOffscreenManager = (
  onEvent: (event: OffscreenEvent) => void,
  getOrCreateGuideId: () => Promise<{
    guideId: string;
    isNew: boolean;
  }>,
) => {
  let sessionId: string | null = null;
  let offscreenApi: ReturnType<typeof getChromeOffscreen> = null;

  const checkAvailability = (): boolean => {
    offscreenApi = getChromeOffscreen();
    return offscreenApi !== null;
  };

  const startSession = async (newSessionId: string, guideId?: string): Promise<boolean> => {
    if (!checkAvailability()) {
      return false;
    }

    try {
      const hasDoc = await offscreenApi!.hasDocument();
      if (!hasDoc) {
        await offscreenApi!.createDocument({
          url: browser.runtime.getURL("/offscreen.html"),
          reasons: ["BLOBS"],
          justification: "Process screenshot uploads reliably across service worker restarts",
        });
      }

      sessionId = newSessionId;

      await browser.runtime.sendMessage({
        type: "start_session",
        sessionId,
        ...(guideId ? { guideId } : {}),
      } satisfies OffscreenCommand);

      return true;
    } catch (error) {
      console.warn("[background] Failed to start offscreen session:", error);
      sessionId = null;
      return false;
    }
  };

  const sendJob = async (
    jobId: string,
    capture: CaptureBridgeMessage,
    screenshotDataUrl: string,
    tabId: number,
  ): Promise<void> => {
    if (!offscreenApi || !sessionId) {
      return;
    }

    try {
      await browser.runtime.sendMessage({
        type: "process_capture",
        jobId,
        capture,
        screenshotDataUrl,
        tabId,
      } satisfies OffscreenCommand);
    } catch (error) {
      console.warn("[background] Failed to send job to offscreen:", error);
    }
  };

  const stopSession = async (): Promise<void> => {
    if (!offscreenApi || !sessionId) {
      return;
    }

    try {
      await browser.runtime.sendMessage({
        type: "stop_session",
      } satisfies OffscreenCommand);
    } catch {
      // Offscreen may already be closed
    }

    sessionId = null;
  };

  const closeDocument = async (): Promise<void> => {
    if (!offscreenApi) {
      return;
    }

    try {
      await offscreenApi.closeDocument();
    } catch {
      // May already be closed
    }
  };

  const syncState = async (): Promise<void> => {
    if (!offscreenApi) {
      return;
    }

    try {
      const hasDoc = await offscreenApi.hasDocument();
      if (!hasDoc) {
        return;
      }

      await browser.runtime.sendMessage({
        type: "get_state",
      } satisfies OffscreenCommand);
    } catch {
      // Offscreen may be unavailable
    }
  };

  /**
   * Reattaches the upload session that was live before the worker suspended.
   * The offscreen document outlives the worker, so its queue is still running.
   */
  const restoreSession = async (sessionIdHint?: string): Promise<boolean> => {
    if (!checkAvailability() || !sessionIdHint) {
      sessionId = null;
      return false;
    }

    try {
      if (!(await offscreenApi!.hasDocument())) {
        sessionId = null;
        return false;
      }
    } catch {
      sessionId = null;
      return false;
    }

    sessionId = sessionIdHint;
    await syncState();
    return true;
  };

  const getSessionId = (): string | null => sessionId;

  if (!checkAvailability()) {
    const runtime = createOffscreenRuntime({
      onEvent,
      getOrCreateGuideId,
    });

    return {
      startSession: async (newSessionId: string, guideId?: string) => {
        runtime.startSession(newSessionId, guideId);
        sessionId = newSessionId;
        return true;
      },
      sendJob: async (
        jobId: string,
        capture: CaptureBridgeMessage,
        screenshotDataUrl: string,
        tabId: number,
      ) => {
        runtime.sendJob(jobId, capture, screenshotDataUrl, tabId);
      },
      stopSession: async () => {
        runtime.stopSession();
        sessionId = null;
      },
      closeDocument: async () => {
        // No-op in Firefox — no offscreen document to close
      },
      /**
       * The runtime starts restoring its queue from `storage.session` at
       * construction. Captures must not be served until that finishes, so
       * boot awaits this before accepting them.
       */
      restoreSession: async (sessionIdHint?: string): Promise<boolean> => {
        await runtime.ready;
        const restoredSessionId = runtime.getSessionId();
        if (restoredSessionId) {
          sessionId = restoredSessionId;
        } else if (sessionIdHint) {
          runtime.startSession(sessionIdHint);
          sessionId = sessionIdHint;
        } else {
          sessionId = null;
          return false;
        }
        runtime.getState();
        return true;
      },
      syncState: async () => {
        runtime.getState();
      },
      getSessionId: () => sessionId,
    };
  }

  return {
    startSession,
    sendJob,
    stopSession,
    closeDocument,
    restoreSession,
    syncState,
    getSessionId,
  };
};
