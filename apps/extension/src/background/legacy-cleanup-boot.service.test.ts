import { describe, expect, test, vi } from "vitest";

import { createLegacyCleanupBoot } from "./legacy-cleanup-boot.service";

describe("legacy cleanup boot", () => {
  test("runs the cleanup module that Agent I adds", async () => {
    const runLegacyCleanup = vi.fn().mockResolvedValue(undefined);
    const run = createLegacyCleanupBoot({
      "./legacy-cleanup.service.ts": async () => ({ runLegacyCleanup }),
    });

    await run();

    expect(runLegacyCleanup).toHaveBeenCalledTimes(1);
  });

  test("does nothing when the module is absent", async () => {
    const run = createLegacyCleanupBoot({});

    await expect(run()).resolves.toBeUndefined();
  });

  test("swallows a failing cleanup so boot can continue", async () => {
    const log = vi.fn();
    const run = createLegacyCleanupBoot(
      {
        "./legacy-cleanup.service.ts": async () => {
          throw new Error("storage unavailable");
        },
      },
      log,
    );

    await expect(run()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith("[background] Legacy cleanup failed:", expect.any(Error));
  });
});
