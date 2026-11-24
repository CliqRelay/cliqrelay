// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { emptyOutboxCounts } from "@/models";

const mocks = vi.hoisted(() => ({
  useLiveQuery: vi.fn(),
  getCounts: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({ useLiveQuery: mocks.useLiveQuery }));
vi.mock("@/services/outbox", () => ({
  outboxRepository: { getCounts: mocks.getCounts },
}));

import { useSyncCounts } from "./useSyncCounts";

describe("useSyncCounts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns the live counts for a session", () => {
    const counts = { ...emptyOutboxCounts, pending: 2, uploading: 1, failed: 3 };
    mocks.useLiveQuery.mockReturnValue(counts);

    const { result } = renderHook(() => useSyncCounts("session-1"));

    expect(result.current).toEqual(counts);
  });

  test("falls back to zero counts before the first snapshot", () => {
    mocks.useLiveQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useSyncCounts("session-1"));

    expect(result.current).toEqual(emptyOutboxCounts);
  });
});
