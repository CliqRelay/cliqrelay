// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useTeamStore } from "@/stores";
import { MockEventSource } from "@/test/mock-event-source";

const { connectRealtime } = vi.hoisted(() => ({ connectRealtime: vi.fn() }));

vi.mock("@repo/api-client", () => ({
  api: {
    realtime: {
      useConnectRealtime: () => ({ mutateAsync: connectRealtime }),
    },
  },
}));
vi.mock("@/utils/http.utils", () => ({ getCsrfTokenHeader: () => ({}) }));

import { RealtimeProvider, useRealtimeEvent } from "./realtime-provider";

function setup(teamId: string | null = "team-1") {
  useTeamStore.setState({ activeTeamId: teamId });
  const onActivity = vi.fn();
  const onOther = vi.fn();
  const hook = renderHook(
    () => {
      useRealtimeEvent("activity", onActivity);
      useRealtimeEvent("activity", onOther);
    },
    { wrapper: RealtimeProvider },
  );
  return { onActivity, onOther, ...hook };
}

const flush = () => act(async () => {});

describe("RealtimeProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];
    connectRealtime.mockReset();
    let n = 0;
    connectRealtime.mockImplementation(async () => ({
      url: `https://api.test/api/v1/realtime/stream?ticket=ticket-${++n}`,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    cleanup();
    useTeamStore.getState().resetTeams();
  });

  test("opens one stream at the URL issued for the active team", async () => {
    setup();
    await flush();

    expect(connectRealtime).toHaveBeenCalledWith({ params: { team_id: "team-1" } });
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.latest().url).toBe(
      "https://api.test/api/v1/realtime/stream?ticket=ticket-1",
    );
  });

  test("does nothing without a team", async () => {
    setup(null);
    await flush();

    expect(connectRealtime).not.toHaveBeenCalled();
    expect(MockEventSource.instances).toHaveLength(0);
  });

  test("fans each event out to every subscriber of that type", async () => {
    const { onActivity, onOther } = setup();
    await flush();

    act(() => MockEventSource.latest().emit("activity", { id: "a" }));

    expect(onActivity).toHaveBeenCalledTimes(1);
    expect(onOther).toHaveBeenCalledTimes(1);
    expect(JSON.parse(onActivity.mock.calls[0][0].data)).toEqual({ id: "a" });
  });

  test("delivers to subscribers added after the stream opened", async () => {
    useTeamStore.setState({ activeTeamId: "team-1" });
    const late = vi.fn();
    const { rerender } = renderHook(
      ({ subscribed }) => {
        useRealtimeEvent(subscribed ? "activity" : "open", late);
      },
      { wrapper: RealtimeProvider, initialProps: { subscribed: false } },
    );
    await flush();

    rerender({ subscribed: true });
    act(() => MockEventSource.latest().emit("activity", { id: "a" }));

    expect(late).toHaveBeenCalledTimes(1);
  });

  test("stops delivering to unmounted subscribers", async () => {
    const { onActivity, unmount } = setup();
    await flush();
    const source = MockEventSource.latest();

    unmount();
    act(() => source.emit("activity", { id: "a" }));

    expect(onActivity).not.toHaveBeenCalled();
  });

  test("reconnects with a fresh URL and exponential backoff after an error", async () => {
    setup();
    await flush();
    const first = MockEventSource.latest();

    act(() => first.emit("error"));
    expect(first.closed).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(999));
    expect(connectRealtime).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(connectRealtime).toHaveBeenCalledTimes(2);
    expect(MockEventSource.latest().url).toMatch(/ticket=ticket-2$/);

    act(() => MockEventSource.latest().emit("error"));
    await act(() => vi.advanceTimersByTimeAsync(1_999));
    expect(connectRealtime).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(connectRealtime).toHaveBeenCalledTimes(3);
  });

  test("keeps subscribers attached across reconnects", async () => {
    const { onActivity } = setup();
    await flush();

    act(() => MockEventSource.latest().emit("error"));
    await act(() => vi.advanceTimersByTimeAsync(1_000));
    act(() => MockEventSource.latest().emit("activity", { id: "a" }));

    expect(onActivity).toHaveBeenCalledTimes(1);
  });

  test("retries when connecting fails", async () => {
    connectRealtime.mockRejectedValueOnce(new Error("offline"));
    setup();
    await flush();
    expect(MockEventSource.instances).toHaveLength(0);

    await act(() => vi.advanceTimersByTimeAsync(1_000));
    expect(MockEventSource.instances).toHaveLength(1);
  });

  test("closes the stream on unmount and stops retrying", async () => {
    const { unmount } = setup();
    await flush();
    const source = MockEventSource.latest();

    unmount();
    expect(source.closed).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(connectRealtime).toHaveBeenCalledTimes(1);
  });

  test("reconnects when the active team changes", async () => {
    setup();
    await flush();
    const first = MockEventSource.latest();

    act(() => useTeamStore.getState().setActiveTeam("team-2"));
    await flush();

    expect(first.closed).toBe(true);
    expect(connectRealtime).toHaveBeenLastCalledWith({ params: { team_id: "team-2" } });
    expect(MockEventSource.instances).toHaveLength(2);
  });

  test("throws when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useRealtimeEvent("activity", () => {}))).toThrow(
      /within a RealtimeProvider/,
    );
  });
});
