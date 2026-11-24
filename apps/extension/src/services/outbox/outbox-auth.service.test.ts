import { ApiError as AuthulaApiError } from "authula/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "@repo/api-client";

import { createOutboxAuth } from "./outbox-auth.service";

const NOW = 1_000_000;

const unauthorized = (status: number) => new ApiError("Unauthorized", status, null, new Headers());
const authulaUnauthorized = (status: number) =>
  new AuthulaApiError("Unauthorized", status, null, new Headers());
const serverError = () => new ApiError("Server error", 500, null, new Headers());

type SetupOptions = {
  userId?: string | null;
  ttlMs?: number;
};

const setup = ({ userId = "user-1", ttlMs = 1000 }: SetupOptions = {}) => {
  const getMe = vi.fn(async () => {
    if (!userId) {
      throw unauthorized(401);
    }
    return { user: { id: userId } };
  });
  let clock = NOW;

  const auth = createOutboxAuth({ getMe, cacheTtlMs: ttlMs, now: () => clock });

  return { auth, getMe, advance: (ms: number) => (clock += ms) };
};

describe("outbox auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("resolves the signed-in user from the API", async () => {
    const { auth, getMe } = setup();

    await expect(auth.getUserId()).resolves.toBe("user-1");
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  test("caches a resolved user for the ttl", async () => {
    const { auth, getMe, advance } = setup({ ttlMs: 1000 });

    await auth.getUserId();
    await auth.getUserId();
    expect(getMe).toHaveBeenCalledTimes(1);

    advance(1001);
    await auth.getUserId();
    expect(getMe).toHaveBeenCalledTimes(2);
  });

  test("does not cache a signed-out result so re-auth is noticed", async () => {
    const { auth, getMe } = setup({ userId: null });

    await expect(auth.getUserId()).resolves.toBeNull();
    await expect(auth.getUserId()).resolves.toBeNull();

    expect(getMe).toHaveBeenCalledTimes(2);
  });

  test.each([
    ["an api 401", unauthorized(401)],
    ["an api 403", unauthorized(403)],
    ["an authula 401", authulaUnauthorized(401)],
  ] as const)("treats %s as signed out without caching", async (_label, error) => {
    const { auth, getMe } = setup();
    getMe.mockRejectedValue(error);

    await expect(auth.getUserId()).resolves.toBeNull();
    await expect(auth.getUserId()).resolves.toBeNull();

    expect(getMe).toHaveBeenCalledTimes(2);
  });

  test.each([
    ["a network error", new Error("network down")],
    ["a 500 response", serverError()],
  ] as const)("propagates %s without caching", async (_label, error) => {
    const { auth, getMe } = setup();
    getMe.mockRejectedValueOnce(error);

    await expect(auth.getUserId()).rejects.toBe(error);
    await expect(auth.getUserId()).resolves.toBe("user-1");

    expect(getMe).toHaveBeenCalledTimes(2);
  });

  test("invalidating forces a fresh lookup", async () => {
    const { auth, getMe } = setup();

    await auth.getUserId();
    auth.invalidate();
    await auth.getUserId();

    expect(getMe).toHaveBeenCalledTimes(2);
  });
});
