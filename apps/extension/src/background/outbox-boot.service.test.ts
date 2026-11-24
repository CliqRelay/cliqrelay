import { beforeEach, describe, expect, test, vi } from "vitest";

import { createOutboxBoot } from "./outbox-boot.service";

const setup = () => {
  const order: string[] = [];
  const track = <T>(name: string, value: T): T => {
    order.push(name);
    return value;
  };

  const repository = {
    resetStaleUploading: vi.fn(async () => track("resetStaleUploading", 1)),
  };
  const scheduler = {
    ensureMaintenanceAlarm: vi.fn(async () => track("ensureMaintenanceAlarm", undefined)),
    sync: vi.fn(async () => track("sync", "stopped" as const)),
    runMaintenance: vi.fn(async () => track("runMaintenance", undefined)),
  };
  const drainer = { drainAll: vi.fn(async () => track("drainAll", undefined)) };
  const badge = { refresh: vi.fn(async () => track("badge", undefined)) };
  const runLegacyCleanup = vi.fn(async () => track("legacyCleanup", undefined));
  const restoreRecording = vi.fn(async () => track("restoreRecording", "recording" as const));

  const runBoot = createOutboxBoot({
    repository,
    scheduler,
    drainer,
    badge,
    runLegacyCleanup,
    restoreRecording,
  });

  return {
    runBoot,
    order,
    repository,
    scheduler,
    drainer,
    badge,
    runLegacyCleanup,
  };
};

describe("outbox boot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("runs cleanup, recovery, retention, drain and badge refresh in order", async () => {
    const { runBoot, order } = setup();

    await expect(runBoot()).resolves.toBe("recording");

    expect(order).toEqual([
      "legacyCleanup",
      "resetStaleUploading",
      "ensureMaintenanceAlarm",
      "restoreRecording",
      "runMaintenance",
      "drainAll",
      "sync",
      "badge",
    ]);
  });

  test("runs once when boot is triggered more than once", async () => {
    const { runBoot, repository, drainer } = setup();

    const [first, second] = await Promise.all([runBoot(), runBoot()]);
    await runBoot();

    expect(first).toBe("recording");
    expect(second).toBe("recording");
    expect(repository.resetStaleUploading).toHaveBeenCalledTimes(1);
    expect(drainer.drainAll).toHaveBeenCalledTimes(1);
  });

  test("still reconciles the alarm, prunes and refreshes the badge when the drain fails", async () => {
    const { runBoot, scheduler, drainer, badge } = setup();
    drainer.drainAll.mockRejectedValue(new Error("drain failed"));

    await expect(runBoot()).rejects.toThrow("drain failed");

    expect(scheduler.sync).toHaveBeenCalledTimes(1);
    expect(scheduler.runMaintenance).toHaveBeenCalledTimes(1);
    expect(badge.refresh).toHaveBeenCalledTimes(1);
  });

  test("allows another boot after a failed one", async () => {
    const { runBoot, runLegacyCleanup } = setup();
    runLegacyCleanup.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(runBoot()).rejects.toThrow("storage unavailable");
    await expect(runBoot()).resolves.toBe("recording");
  });
});
