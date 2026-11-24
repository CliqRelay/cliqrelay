import { beforeEach, describe, expect, test, vi } from "vitest";

import { createOutboxBoot } from "./outbox-boot.service";

const setup = () => {
  const order: string[] = [];
  const track = <T>(name: string, value: T) => {
    order.push(name);
    return value;
  };

  const repository = {
    resetStaleUploading: vi.fn(async () => track("resetStaleUploading", 1)),
  };
  const scheduler = {
    ensureMaintenanceAlarm: vi.fn(async () => track("ensureMaintenanceAlarm", undefined)),
    sync: vi.fn(async () => track("sync", undefined)),
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
    restoreRecording,
  };
};

describe("outbox boot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("cleans up legacy storage before hydrating and recovers stale uploads", async () => {
    const { runBoot, order } = setup();

    await expect(runBoot()).resolves.toBe("recording");

    expect(order.indexOf("legacyCleanup")).toBeLessThan(order.indexOf("restoreRecording"));
    expect(order.indexOf("resetStaleUploading")).toBeLessThan(order.indexOf("restoreRecording"));
  });

  test("restores the session, refreshes the badge, drains and keeps retention running", async () => {
    const { runBoot, repository, scheduler, drainer, badge } = setup();

    await runBoot();

    expect(repository.resetStaleUploading).toHaveBeenCalledTimes(1);
    expect(scheduler.ensureMaintenanceAlarm).toHaveBeenCalledTimes(1);
    expect(badge.refresh).toHaveBeenCalledTimes(1);
    expect(drainer.drainAll).toHaveBeenCalledTimes(1);
    expect(scheduler.sync).toHaveBeenCalledTimes(1);
    expect(scheduler.runMaintenance).toHaveBeenCalledTimes(1);
  });
});
