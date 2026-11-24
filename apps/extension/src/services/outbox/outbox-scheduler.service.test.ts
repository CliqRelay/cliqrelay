import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createOutboxScheduler,
  OUTBOX_DRAIN_ALARM_NAME,
  OUTBOX_MAINTENANCE_ALARM_NAME,
} from "./outbox-scheduler.service";
import type { RecordingLifecycleStore, RecordingStatus } from "@/models";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";

const NOW = new Date("2026-11-24T10:00:00.000Z");

type SetupOptions = {
  status?: RecordingStatus;
  outstanding?: number;
  isSignedOut?: boolean;
};

const setup = ({ status = "stopped", outstanding = 0, isSignedOut = false }: SetupOptions = {}) => {
  const alarms = {
    create: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(true),
  };

  const lifecycleStore = {
    get: vi.fn().mockResolvedValue({ status, isSignedOut, sessionId: "session-1" }),
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
    test("creates the drain and maintenance alarms", async () => {
      const { scheduler, alarms } = setup({ status: "recording" });

      await scheduler.start();

      expect(alarms.create).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME, { periodInMinutes: 1 });
      expect(alarms.create).toHaveBeenCalledWith(OUTBOX_MAINTENANCE_ALARM_NAME, {
        periodInMinutes: 1440,
      });
    });
  });

  describe("sync", () => {
    test.each(["recording", "paused"] as const)(
      "keeps the drain alarm while %s with nothing outstanding",
      async (status) => {
        const { scheduler, alarms, countOutstanding } = setup({ status });

        await scheduler.sync();

        expect(alarms.create).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME, {
          periodInMinutes: 1,
        });
        expect(alarms.clear).not.toHaveBeenCalled();
        expect(countOutstanding).not.toHaveBeenCalled();
      },
    );

    test.each([
      ["stopped", 3],
      ["idle", 2],
    ] as const)(
      "keeps the drain alarm while %s has %i outstanding",
      async (status, outstanding) => {
        const { scheduler, alarms } = setup({ status, outstanding });

        await scheduler.sync();

        expect(alarms.create).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME, {
          periodInMinutes: 1,
        });
        expect(alarms.clear).not.toHaveBeenCalled();
      },
    );

    test.each(["stopped", "idle"] as const)(
      "clears the drain alarm when %s has nothing outstanding",
      async (status) => {
        const { scheduler, alarms } = setup({ status });

        await scheduler.sync();

        expect(alarms.clear).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME);
        expect(alarms.create).not.toHaveBeenCalled();
      },
    );
  });

  describe("runMaintenance", () => {
    test.each([false, true])(
      "prunes with the current time when signed out is %s",
      async (isSignedOut) => {
        const { scheduler, repository, onMaintenance } = setup({ isSignedOut });

        await scheduler.runMaintenance();

        expect(repository.prune).toHaveBeenCalledWith(NOW);
        expect(onMaintenance).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe("afterDrain", () => {
    test("runs retention and clears the drain alarm for a stopped session with nothing left", async () => {
      const { scheduler, alarms, repository } = setup({ status: "stopped" });

      await scheduler.afterDrain();

      expect(alarms.clear).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME);
      expect(repository.prune).toHaveBeenCalledWith(NOW);
    });

    test("skips retention while a session is still recording", async () => {
      const { scheduler, repository } = setup({ status: "recording" });

      await scheduler.afterDrain();

      expect(repository.prune).not.toHaveBeenCalled();
    });
  });

  describe("handleAlarm", () => {
    test("drains and re-syncs on the drain alarm", async () => {
      const { scheduler, drainAll, alarms } = setup({ status: "stopped" });

      await scheduler.handleAlarm({ name: OUTBOX_DRAIN_ALARM_NAME });

      expect(drainAll).toHaveBeenCalledTimes(1);
      expect(alarms.clear).toHaveBeenCalledWith(OUTBOX_DRAIN_ALARM_NAME);
    });

    test("re-syncs even when the drain fails", async () => {
      const { scheduler, drainAll, alarms } = setup({ status: "stopped" });
      drainAll.mockRejectedValue(new Error("drain failed"));

      await expect(scheduler.handleAlarm({ name: OUTBOX_DRAIN_ALARM_NAME })).rejects.toThrow(
        "drain failed",
      );

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
