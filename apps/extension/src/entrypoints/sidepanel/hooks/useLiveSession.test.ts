// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useLiveQuery: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({ useLiveQuery: mocks.useLiveQuery }));
vi.mock("@/services/outbox", () => ({
  outboxRepository: { getSession: mocks.getSession },
}));

import { useLiveSession } from "./useLiveSession";

describe("useLiveSession", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns the live session for the lifecycle session id", () => {
    const session = { id: "session-1", userId: "user-1" };
    mocks.useLiveQuery.mockReturnValue(session);

    const { result } = renderHook(() => useLiveSession("session-1"));

    expect(result.current).toEqual(session);
    expect(mocks.useLiveQuery.mock.calls[0]?.[1]).toEqual(["session-1"]);
  });

  test("returns undefined while there is no session", () => {
    mocks.useLiveQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useLiveSession(undefined));

    expect(result.current).toBeUndefined();
  });
});
