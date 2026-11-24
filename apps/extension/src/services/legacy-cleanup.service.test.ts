import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: { remove: vi.fn().mockResolvedValue(undefined) },
      session: { remove: vi.fn().mockResolvedValue(undefined) },
    },
  },
}));

import { browser } from "wxt/browser";

import { createLegacyCleanup, runLegacyCleanup } from "./legacy-cleanup.service";

type Storage = NonNullable<Parameters<typeof createLegacyCleanup>[0]>;

const createStorage = (): Storage => ({
  remove: vi.fn<Storage["remove"]>().mockResolvedValue(undefined),
});

describe("legacy cleanup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("removes the legacy guide id and offscreen session keys", async () => {
    const local = createStorage();
    const session = createStorage();

    await createLegacyCleanup(local, session)();

    expect(local.remove).toHaveBeenCalledWith("activeGuideId");
    expect(session.remove).toHaveBeenCalledWith("offscreen_session");
  });

  test("can run repeatedly without side effects", async () => {
    const local = createStorage();
    const session = createStorage();
    const cleanup = createLegacyCleanup(local, session);

    await cleanup();
    await expect(cleanup()).resolves.toBeUndefined();

    expect(local.remove).toHaveBeenCalledTimes(2);
    expect(session.remove).toHaveBeenCalledTimes(2);
  });

  test("treats already-missing keys as success without removing anything twice", async () => {
    const local = createStorage();
    const session = createStorage();

    await expect(createLegacyCleanup(local, session)()).resolves.toBeUndefined();

    expect(local.remove).toHaveBeenCalledTimes(1);
    expect(local.remove).toHaveBeenCalledWith("activeGuideId");
    expect(session.remove).toHaveBeenCalledTimes(1);
    expect(session.remove).toHaveBeenCalledWith("offscreen_session");
  });

  test.each([
    ["the session area is unavailable", false, true],
    ["the local area is unavailable", true, false],
    ["both areas are unavailable", false, false],
  ])("does not throw when %s", async (_name, hasLocal, hasSession) => {
    const local = hasLocal ? createStorage() : undefined;
    const session = hasSession ? createStorage() : undefined;

    await expect(createLegacyCleanup(local, session)()).resolves.toBeUndefined();
  });

  test("swallows storage failures", async () => {
    const local: Storage = {
      remove: vi.fn<Storage["remove"]>().mockRejectedValue(new Error("storage removed")),
    };
    const session: Storage = {
      remove: vi.fn<Storage["remove"]>().mockRejectedValue(new Error("storage removed")),
    };

    await expect(createLegacyCleanup(local, session)()).resolves.toBeUndefined();
  });

  test("the exported cleanup targets browser storage", async () => {
    await runLegacyCleanup();

    expect(browser.storage.local.remove).toHaveBeenCalledWith("activeGuideId");
    expect(browser.storage.session.remove).toHaveBeenCalledWith("offscreen_session");
  });
});
