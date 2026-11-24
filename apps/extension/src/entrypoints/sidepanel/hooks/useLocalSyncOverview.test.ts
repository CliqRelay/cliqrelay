// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { LocalSession, LocalStep, OutboxCounts } from "@/models";
import { emptyOutboxCounts } from "@/models";

const mocks = vi.hoisted(() => ({
  useLiveQuery: vi.fn(),
  listSessions: vi.fn(),
  getCounts: vi.fn(),
  listSteps: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({ useLiveQuery: mocks.useLiveQuery }));
vi.mock("@/services/outbox", () => ({
  outboxRepository: {
    listSessions: mocks.listSessions,
    getCounts: mocks.getCounts,
    listSteps: mocks.listSteps,
  },
}));

import { loadLocalSyncOverview, useLocalSyncOverview } from "./useLocalSyncOverview";

const makeSession = (id: string, userId: string): LocalSession => ({
  id,
  userId,
  guideId: `guide-${id}`,
  clientGuideId: `client-${id}`,
  startedAt: "2026-11-24T09:00:00.000Z",
  lastActivityAt: "2026-11-24T09:05:00.000Z",
  nextStepIndex: 1,
});

const makeCounts = (overrides: Partial<OutboxCounts> = {}): OutboxCounts => ({
  ...emptyOutboxCounts,
  ...overrides,
});

const failedStep = (sessionId: string): LocalStep => ({
  id: `failed-${sessionId}`,
  sessionId,
  guideId: `guide-${sessionId}`,
  stepIndex: 0,
  kind: "interaction",
  action: "click",
  url: "https://app.example.com",
  capturedAt: "2026-11-24T09:00:00.000Z",
  syncStatus: "failed",
  retryCount: 1,
  createdAt: "2026-11-24T09:00:00.000Z",
  updatedAt: "2026-11-24T09:00:00.000Z",
});

describe("loadLocalSyncOverview", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns nothing without a user id", async () => {
    const overview = await loadLocalSyncOverview(undefined);

    expect(overview).toEqual({
      counts: emptyOutboxCounts,
      sessions: [],
      otherSessions: [],
    });
    expect(mocks.listSessions).not.toHaveBeenCalled();
  });

  test("aggregates the current user's sessions and excludes other accounts", async () => {
    const own = makeSession("own-1", "user-1");
    const ownEmpty = makeSession("own-empty", "user-1");
    const other = makeSession("other-1", "user-2");

    mocks.listSessions.mockResolvedValue([own, ownEmpty, other]);
    mocks.getCounts.mockImplementation(async (sessionId: string) =>
      sessionId === "own-1"
        ? makeCounts({ pending: 2, uploading: 1, synced: 4, failed: 1 })
        : emptyOutboxCounts,
    );
    mocks.listSteps.mockImplementation(async (sessionId: string) =>
      sessionId === "own-1" ? [failedStep(sessionId)] : [],
    );

    const overview = await loadLocalSyncOverview("user-1");

    expect(overview.counts).toEqual({
      pending: 2,
      uploading: 1,
      synced: 4,
      failed: 1,
      deleted: 0,
    });
    expect(overview.sessions).toHaveLength(1);
    expect(overview.sessions[0]?.session.id).toBe("own-1");
    expect(overview.sessions[0]?.failedSteps).toHaveLength(1);
    expect(overview.otherSessions.map((session) => session.id)).toEqual(["other-1"]);
  });
});

describe("useLocalSyncOverview", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("reports loading until Dexie publishes a snapshot", () => {
    mocks.useLiveQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useLocalSyncOverview("user-1"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.overview.counts).toEqual(emptyOutboxCounts);
  });

  test("returns the live overview", () => {
    const overview = {
      counts: makeCounts({ pending: 1 }),
      sessions: [],
      otherSessions: [],
    };
    mocks.useLiveQuery.mockReturnValue(overview);

    const { result } = renderHook(() => useLocalSyncOverview("user-1"));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.overview).toBe(overview);
  });
});
