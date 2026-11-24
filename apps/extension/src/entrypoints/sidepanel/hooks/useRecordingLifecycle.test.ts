// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { STORAGE_KEY_RECORDING_LIFECYCLE } from "@/utils/constants";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      session: {
        get: mocks.get,
        onChanged: {
          addListener: mocks.addListener,
          removeListener: mocks.removeListener,
        },
      },
    },
  },
}));

import { useRecordingLifecycle } from "./useRecordingLifecycle";

const lifecycle = (value: unknown) => ({ [STORAGE_KEY_RECORDING_LIFECYCLE]: value });

const getListener = () =>
  mocks.addListener.mock.calls[0]?.[0] as (changes: Record<string, unknown>) => void;

describe("useRecordingLifecycle", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("reads the lifecycle from session storage", async () => {
    mocks.get.mockResolvedValue(
      lifecycle({
        status: "recording",
        sessionId: "session-1",
        isSignedOut: false,
      }),
    );

    const { result } = renderHook(() => useRecordingLifecycle());

    await waitFor(() => expect(result.current.status).toBe("recording"));
    expect(result.current.sessionId).toBe("session-1");
    expect(result.current.isSignedOut).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(mocks.get).toHaveBeenCalledWith(STORAGE_KEY_RECORDING_LIFECYCLE);
  });

  test("updates when session storage changes", async () => {
    mocks.get.mockResolvedValue(lifecycle({ status: "idle", isSignedOut: false }));
    const { result } = renderHook(() => useRecordingLifecycle());

    await waitFor(() => expect(result.current.status).toBe("idle"));

    act(() => {
      getListener()(
        lifecycle({
          newValue: {
            status: "paused",
            sessionId: "session-2",
            isSignedOut: true,
          },
        }),
      );
    });

    expect(result.current.status).toBe("paused");
    expect(result.current.sessionId).toBe("session-2");
    expect(result.current.isSignedOut).toBe(true);
  });

  test("ignores unrelated storage keys", async () => {
    mocks.get.mockResolvedValue(lifecycle({ status: "recording", isSignedOut: false }));
    const { result } = renderHook(() => useRecordingLifecycle());

    await waitFor(() => expect(result.current.status).toBe("recording"));

    act(() => {
      getListener()({ "other.key": { newValue: { status: "idle" } } });
    });

    expect(result.current.status).toBe("recording");
  });

  test("keeps the last session id while a stopped lifecycle drains", async () => {
    mocks.get.mockResolvedValue(
      lifecycle({ status: "recording", sessionId: "session-1", isSignedOut: false }),
    );
    const { result } = renderHook(() => useRecordingLifecycle());

    await waitFor(() => expect(result.current.sessionId).toBe("session-1"));

    act(() => {
      getListener()(lifecycle({ newValue: { status: "stopped", isSignedOut: false } }));
    });

    expect(result.current.status).toBe("stopped");
    expect(result.current.sessionId).toBe("session-1");

    act(() => {
      getListener()(lifecycle({ newValue: { status: "idle", isSignedOut: false } }));
    });

    expect(result.current.sessionId).toBeUndefined();
  });

  test("accepts the PR 2 lifecycle without outbox fields", async () => {
    mocks.get.mockResolvedValue(lifecycle({ status: "stopped", sessionId: "session-3" }));

    const { result } = renderHook(() => useRecordingLifecycle());

    await waitFor(() => expect(result.current.status).toBe("stopped"));
    expect(result.current.sessionId).toBe("session-3");
    expect(result.current.isSignedOut).toBe(false);
  });

  test("ignores an invalid lifecycle record", async () => {
    mocks.get.mockResolvedValue(lifecycle({ status: "not-a-status" }));

    const { result } = renderHook(() => useRecordingLifecycle());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBeUndefined();
    expect(result.current.lifecycle).toBeUndefined();
  });

  test("removes the listener on unmount", async () => {
    mocks.get.mockResolvedValue(lifecycle({ status: "idle", isSignedOut: false }));
    const { unmount } = renderHook(() => useRecordingLifecycle());

    await waitFor(() => expect(mocks.addListener).toHaveBeenCalledTimes(1));
    unmount();

    expect(mocks.removeListener).toHaveBeenCalledTimes(1);
  });
});
