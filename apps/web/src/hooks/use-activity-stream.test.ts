// @vitest-environment jsdom

import { createElement, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { useTeamStore } from "@/stores";
import { MockEventSource } from "@/test/mock-event-source";

vi.mock("@repo/api-client", () => ({
  api: {
    activityLogs: {
      getListActivityLogsQueryKey: (params: object) => ["/api/v1/activity-logs", params],
    },
    realtime: {
      useConnectRealtime: () => ({
        mutateAsync: async () => ({ url: "https://api.test/api/v1/realtime/stream?ticket=t" }),
      }),
    },
  },
}));
vi.mock("@/utils/http.utils", () => ({ getCsrfTokenHeader: () => ({}) }));

import { useActivityStream } from "./use-activity-stream";

const queryKey = ["/api/v1/activity-logs", { team_id: "team-1", limit: 2 }];

const row = (id: string) => ({
  id,
  event_type: "guide.created",
  created_at: "2026-09-23T10:00:00Z",
  metadata: { guide: { title: `Guide ${id}` } },
});

async function setup() {
  useTeamStore.setState({ activeTeamId: "team-1" });
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(RealtimeProvider, null, children),
    );
  renderHook(() => useActivityStream({ team_id: "team-1", limit: 2 }), { wrapper });
  await act(async () => {});
  return { queryClient, invalidate };
}

describe("useActivityStream", () => {
  beforeEach(() => {
    vi.stubGlobal("EventSource", MockEventSource);
    MockEventSource.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    useTeamStore.getState().resetTeams();
  });

  test("prepends activity, dedupes by id and trims to the limit", async () => {
    const { queryClient } = await setup();
    queryClient.setQueryData(queryKey, { data: [{ id: "a" }, { id: "b" }] });

    act(() => MockEventSource.latest().emit("activity", row("b")));
    expect(
      queryClient.getQueryData<{ data: { id: string }[] }>(queryKey)?.data.map((l) => l.id),
    ).toEqual(["b", "a"]);

    act(() => MockEventSource.latest().emit("activity", row("c")));
    const data = queryClient.getQueryData<{ data: Record<string, unknown>[] }>(queryKey)!.data;
    expect(data.map((l) => l.id)).toEqual(["c", "b"]);
    expect(data[0]).toMatchObject({
      eventType: "guide.created",
      metadata: { guide: { title: "Guide c" } },
    });
  });

  test("refetches the list when the stream opens", async () => {
    const { invalidate } = await setup();

    act(() => MockEventSource.latest().emit("open"));

    expect(invalidate).toHaveBeenCalledWith({ queryKey });
  });
});
