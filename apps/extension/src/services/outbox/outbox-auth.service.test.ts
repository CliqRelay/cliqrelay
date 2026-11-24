import { beforeEach, describe, expect, test, vi } from "vitest";

import { createOutboxAuth } from "./outbox-auth.service";

const NOW = 1_000_000;

type SetupOptions = {
  userId?: string | null;
  ttlMs?: number;
};

const setup = ({ userId = "user-1", ttlMs = 1000 }: SetupOptions = {}) => {
  const getMe = vi.fn(async () => {
    if (!userId) {
      throw new Error("Unauthorized");
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

  test("invalidating forces a fresh lookup", async () => {
    const { auth, getMe } = setup();

    await auth.getUserId();
    auth.invalidate();
    await auth.getUserId();

    expect(getMe).toHaveBeenCalledTimes(2);
  });
});
