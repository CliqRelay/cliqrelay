import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createOutboxScheduler,
  OUTBOX_DRAIN_ALARM_NAME,
  OUTBOX_DRAIN_PERIOD_MINUTES,
  OUTBOX_MAINTENANCE_ALARM_NAME,
  OUTBOX_MAINTENANCE_PERIOD_MINUTES,
} from "./outbox-scheduler.service";
import type { RecordingLifecycleStore } from "@/models";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";

const NOW = new Date("2026-11-24T10:00:00.000Z");

const setup = ({
  status = "stopped" as "idle" | "recording" | "paused" | "stopped",
  outstanding = 0 as number,
} = {}) => {
  const alarms = {
    create: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(true),
  };

  const lifecycleStore = {
    get: vi.fn().mockResolvedValue({ status, isSignedOut: false, sessionId: "session-1" }),
  } as unknown as RecordingLifecycleStore;

  const repository = {
    prune: vi.fn().mockResolvedValue({ sessions: 0, steps: 0, blobs: 0 }),
  } as unknown as Pick<OutboxRepository, "prune">;

  const drainAll = vi.fn().mockResolvedValue(undefined);
  const countOutstanding = vi.fn().mockResolvedValue(outstanding);
  const onMaintenance = vi.fn().mockResolvedValue(undefined);

  const scheduler = createOutboxScheduler({
    alarms,
    lifecycleStore,
    repository,
    drainAll,
    countOutstanding,
    onMaintenance,
    now: () => NOW,
  });

  return {
    scheduler,
    alarms,
    lifecycleStore,
    repository,
    drainAll,
    countOutstanding,
    onMaintenance,
  };
};

describe("outbox scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("start", () => {
    test("creates the one-minute drain alarm and the daily maintenance alarm", async () => {
      const { scheduler, alarms } = setup({ status: "recording" });

      await scheduler.start();

      expect(alarms.create).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME, {
        periodInMinutes: OUTBOX_DRAIN_PERIOD_MINUTES,
      });
      expect(alarms.create).toHaveBeenCalledWith(OUTBOX_MAINTENANCE_ALARM_NAME, {
        periodInMinutes: OUTBOX_MAINTENANCE_PERIOD_MINUTES,
      });
    });
  });

  describe("sync", () => {
    test.each([
      ["recording", 0],
      ["paused", 0],
      ["stopped", 3],
      ["idle", 2],
    ])("status %s with %s outstanding keeps the drain alarm", async (status, outstanding) => {
      const { scheduler, alarms } = setup({
        status: status as "idle" | "recording" | "paused" | "stopped",
        outstanding: outstanding as number,
      });

      await scheduler.sync();

      expect(alarms.create).toHaveBeenCalledWith(
        OUTBOX_DRAIN_ALARM_NAME,
        expect.objectContaining({ periodInMinutes: OUTBOX_DRAIN_PERIOD_MINUTES }),
      );
      expect(alarms.clear).not.toHaveBeenCalled();
    });

    test.each([
      ["stopped", 0],
      ["idle", 0],
    ])("status %s with %s outstanding clears the drain alarm", async (status, outstanding) => {
      const { scheduler, alarms } = setup({
        status: status as "idle" | "recording" | "paused" | "stopped",
        outstanding: outstanding as number,
      });

      await scheduler.sync();

      expect(alarms.clear).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME);
      expect(alarms.create).not.toHaveBeenCalled();
    });
  });

  describe("runMaintenance", () => {
    test("prunes with the current time and refreshes the badge", async () => {
      const { scheduler, repository, onMaintenance } = setup();

      await scheduler.runMaintenance();

      expect(repository.prune).toHaveBeenCalledWith(NOW);
      expect(onMaintenance).toHaveBeenCalledTimes(1);
    });
  });

  describe("afterDrain", () => {
    test("clears or keeps the alarm and runs retention for a finished session", async () => {
      const { scheduler, alarms, repository } = setup({ status: "stopped", outstanding: 0 });

      await scheduler.afterDrain();

      expect(alarms.clear).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME);
      expect(repository.prune).toHaveBeenCalledTimes(1);
    });

    test("skips retention while a session is still recording", async () => {
      const { scheduler, repository } = setup({ status: "recording", outstanding: 0 });

      await scheduler.afterDrain();

      expect(repository.prune).not.toHaveBeenCalled();
    });
  });

  describe("handleAlarm", () => {
    test("drains and re-syncs on the drain alarm", async () => {
      const { scheduler, drainAll, alarms } = setup({ status: "stopped", outstanding: 0 });

      await scheduler.handleAlarm({ name: OUTBOX_DRAIN_ALARM_NAME });

      expect(drainAll).toHaveBeenCalledTimes(1);
      expect(alarms.clear).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME);
    });

    test("prunes on the maintenance alarm", async () => {
      const { scheduler, repository } = setup();

      await scheduler.handleAlarm({ name: OUTBOX_MAINTENANCE_ALARM_NAME });

      expect(repository.prune).toHaveBeenCalledWith(NOW);
    });

    test("ignores unrelated alarms", async () => {
      const { scheduler, drainAll, repository } = setup();

      await scheduler.handleAlarm({ name: "something-else" });

      expect(drainAll).not.toHaveBeenCalled();
      expect(repository.prune).not.toHaveBeenCalled();
    });
  });
});
