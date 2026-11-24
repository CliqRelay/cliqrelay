import { beforeEach, describe, expect, test, vi } from "vitest";

import { createOutboxBoot } from "./outbox-boot.service";
import type { RecordingStatus } from "@/models";
import {
  createOutboxScheduler,
  OUTBOX_DRAIN_ALARM_NAME,
} from "@/services/outbox/outbox-scheduler.service";

type BootDeps = Parameters<typeof createOutboxBoot>[0];
type SchedulerDeps = Parameters<typeof createOutboxScheduler>[0];

const setup = () => {
  const order: string[] = [];
  const track = <T>(name: string, value: T): T => {
    order.push(name);
    return value;
  };

  const resetStaleUploading = vi
    .fn<BootDeps["repository"]["resetStaleUploading"]>()
    .mockImplementation(async () => track("resetStaleUploading", 1));
  const ensureMaintenanceAlarm = vi
    .fn<BootDeps["scheduler"]["ensureMaintenanceAlarm"]>()
    .mockImplementation(async () => {
      track("ensureMaintenanceAlarm", undefined);
    });
  const sync = vi
    .fn<BootDeps["scheduler"]["sync"]>()
    .mockImplementation(async () => track<RecordingStatus>("sync", "stopped"));
  const runMaintenance = vi
    .fn<BootDeps["scheduler"]["runMaintenance"]>()
    .mockImplementation(async () => {
      track("runMaintenance", undefined);
    });
  const drainAll = vi.fn<BootDeps["drainer"]["drainAll"]>().mockImplementation(async () => {
    track("drainAll", undefined);
  });
  const refresh = vi.fn<BootDeps["badge"]["refresh"]>().mockImplementation(async () => {
    track("badge", undefined);
  });
  const runLegacyCleanup = vi.fn<BootDeps["runLegacyCleanup"]>().mockImplementation(async () => {
    track("legacyCleanup", undefined);
  });
  const restoreRecording = vi
    .fn<BootDeps["restoreRecording"]>()
    .mockImplementation(async () => track<RecordingStatus>("restoreRecording", "recording"));
  const log = vi.fn<NonNullable<BootDeps["log"]>>();

  const runBoot = createOutboxBoot({
    repository: { resetStaleUploading },
    scheduler: { ensureMaintenanceAlarm, sync, runMaintenance },
    drainer: { drainAll },
    badge: { refresh },
    runLegacyCleanup,
    restoreRecording,
    log,
  });

  return {
    runBoot,
    order,
    resetStaleUploading,
    ensureMaintenanceAlarm,
    sync,
    runMaintenance,
    drainAll,
    refresh,
    runLegacyCleanup,
    log,
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
    const { runBoot, resetStaleUploading, drainAll } = setup();

    const [first, second] = await Promise.all([runBoot(), runBoot()]);
    await runBoot();

    expect(first).toBe("recording");
    expect(second).toBe("recording");
    expect(resetStaleUploading).toHaveBeenCalledTimes(1);
    expect(drainAll).toHaveBeenCalledTimes(1);
  });

  test("still reconciles the alarm, prunes and refreshes the badge when the drain fails", async () => {
    const { runBoot, sync, runMaintenance, drainAll, refresh } = setup();
    drainAll.mockRejectedValue(new Error("drain failed"));

    await expect(runBoot()).rejects.toThrow("drain failed");

    expect(sync).toHaveBeenCalledTimes(1);
    expect(runMaintenance).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test("refreshes the badge when the post-drain sync fails", async () => {
    const { runBoot, sync, refresh, log } = setup();
    const error = new Error("alarm unavailable");
    sync.mockRejectedValue(error);

    await expect(runBoot()).resolves.toBe("recording");

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      "[background] Failed to reconcile the outbox alarm after boot:",
      error,
    );
  });

  test("keeps the drain alarm and refreshes the badge when the backlog check fails", async () => {
    const alarms: SchedulerDeps["alarms"] = {
      create: vi.fn<SchedulerDeps["alarms"]["create"]>().mockResolvedValue(undefined),
      clear: vi.fn<SchedulerDeps["alarms"]["clear"]>().mockResolvedValue(true),
    };
    const countOutstanding = vi
      .fn<SchedulerDeps["countOutstanding"]>()
      .mockRejectedValue(new Error("network down"));
    const schedulerLog = vi.fn<NonNullable<SchedulerDeps["log"]>>();
    const scheduler = createOutboxScheduler({
      alarms,
      lifecycleStore: {
        get: async () => ({ status: "stopped", isSignedOut: false, sessionId: "session-1" }),
      },
      repository: {
        prune: async () => ({ sessions: 0, steps: 0, blobs: 0 }),
      },
      drainAll: async () => {},
      countOutstanding,
      log: schedulerLog,
    });
    const badge: BootDeps["badge"] = {
      refresh: vi.fn<BootDeps["badge"]["refresh"]>().mockResolvedValue(undefined),
    };
    const runBoot = createOutboxBoot({
      repository: { resetStaleUploading: async () => 0 },
      scheduler,
      drainer: { drainAll: async () => {} },
      badge,
      runLegacyCleanup: async () => {},
      restoreRecording: async () => "recording",
    });

    await expect(runBoot()).resolves.toBe("recording");

    expect(alarms.create).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME, { periodInMinutes: 1 });
    expect(alarms.clear).not.toHaveBeenCalled();
    expect(schedulerLog).toHaveBeenCalledWith(
      "[background] Failed to read the outbox backlog; keeping the drain alarm",
      { error: "network down" },
    );
    expect(badge.refresh).toHaveBeenCalledTimes(1);
  });

  test("allows another boot after a failed one", async () => {
    const { runBoot, runLegacyCleanup } = setup();
    runLegacyCleanup.mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(runBoot()).rejects.toThrow("storage unavailable");
    await expect(runBoot()).resolves.toBe("recording");
  });
});
