import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const sendMessage = vi.fn();
const storageGet = vi.fn();

vi.mock("wxt/browser", () => ({
  browser: {
    runtime: {
      sendMessage: (...args: unknown[]) => sendMessage(...args),
      getURL: (path: string) => `chrome-extension://test${path}`,
    },
    storage: {
      session: {
        get: (...args: unknown[]) => storageGet(...args),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

import { createOffscreenManager } from "./offscreen-manager.service";

const setChromeOffscreen = (hasDocument: boolean) => {
  const offscreen = {
    hasDocument: vi.fn().mockResolvedValue(hasDocument),
    createDocument: vi.fn().mockResolvedValue(undefined),
    closeDocument: vi.fn().mockResolvedValue(undefined),
  };
  (globalThis as Record<string, unknown>).chrome = { offscreen };
  return offscreen;
};

const clearChrome = () => {
  delete (globalThis as Record<string, unknown>).chrome;
};

const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

describe("offscreen manager", () => {
  beforeEach(() => {
    sendMessage.mockReset().mockResolvedValue(undefined);
    storageGet.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    clearChrome();
  });

  describe("restoreSession on Chrome", () => {
    test("reattaches the persisted session id and asks the document for its state", async () => {
      setChromeOffscreen(true);
      const manager = createOffscreenManager(vi.fn(), vi.fn());

      await expect(manager.restoreSession("session-1")).resolves.toBe(true);

      expect(manager.getSessionId()).toBe("session-1");
      expect(sendMessage).toHaveBeenCalledWith({ type: "get_state" });
    });

    test("clears the session when the offscreen document is gone", async () => {
      setChromeOffscreen(false);
      const manager = createOffscreenManager(vi.fn(), vi.fn());

      await expect(manager.restoreSession("session-1")).resolves.toBe(false);

      expect(manager.getSessionId()).toBeNull();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    test("does not reattach without a persisted session id", async () => {
      setChromeOffscreen(true);
      const manager = createOffscreenManager(vi.fn(), vi.fn());

      await expect(manager.restoreSession(undefined)).resolves.toBe(false);

      expect(manager.getSessionId()).toBeNull();
      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe("restoreSession on Firefox", () => {
    test("waits for the runtime to restore its queue before reporting the session", async () => {
      const saved = deferred<Record<string, unknown>>();
      storageGet.mockReturnValue(saved.promise);
      const onEvent = vi.fn();
      const manager = createOffscreenManager(onEvent, vi.fn());

      const restored = manager.restoreSession("lifecycle-session");
      await Promise.resolve();
      expect(manager.getSessionId()).toBeNull();

      saved.resolve({
        offscreen_session: { sessionId: "saved-session", pendingJobs: [] },
      });

      await expect(restored).resolves.toBe(true);
      expect(manager.getSessionId()).toBe("saved-session");
      expect(onEvent).toHaveBeenCalledWith({
        type: "session_state",
        pending: 0,
        active: 0,
        completed: 0,
        failed: 0,
      });
    });

    test("starts a fresh session when the runtime restored nothing", async () => {
      const manager = createOffscreenManager(vi.fn(), vi.fn());

      await expect(manager.restoreSession("lifecycle-session")).resolves.toBe(true);

      expect(manager.getSessionId()).toBe("lifecycle-session");
    });

    test("reports no session when neither the runtime nor the record has one", async () => {
      const manager = createOffscreenManager(vi.fn(), vi.fn());

      await expect(manager.restoreSession(undefined)).resolves.toBe(false);

      expect(manager.getSessionId()).toBeNull();
    });
  });
});
