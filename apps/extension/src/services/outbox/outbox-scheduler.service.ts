import type { OutboxRepository } from "./outbox.repository";
import type { RecordingLifecycleStore } from "@/models";

export const OUTBOX_DRAIN_ALARM_NAME = "cliqrelay.outbox-drain";
export const OUTBOX_MAINTENANCE_ALARM_NAME = "cliqrelay.outbox-maintenance";
export const OUTBOX_DRAIN_PERIOD_MINUTES = 1;
export const OUTBOX_MAINTENANCE_PERIOD_MINUTES = 24 * 60;

export type OutboxAlarms = {
  create: (name: string, info: { periodInMinutes: number }) => Promise<void> | void;
  clear: (name: string) => Promise<unknown> | unknown;
};

type OutboxSchedulerDeps = {
  alarms: OutboxAlarms;
  lifecycleStore: RecordingLifecycleStore;
  repository: Pick<OutboxRepository, "prune">;
  drainAll: () => Promise<void>;
  countOutstanding: () => Promise<number>;
  onMaintenance?: () => void | Promise<void>;
  now?: () => Date;
};

/**
 * Owns the wake-ups. A one-minute alarm keeps draining while the sidepanel is
 * closed and is cleared once a stopped session has nothing left to upload. The
 * daily alarm (also run on boot and after every drain) handles retention.
 */
export const createOutboxScheduler = ({
  alarms,
  lifecycleStore,
  repository,
  drainAll,
  countOutstanding,
  onMaintenance,
  now = () => new Date(),
}: OutboxSchedulerDeps) => {
  const ensureDrainAlarm = async () => {
    await alarms.create(OUTBOX_DRAIN_ALARM_NAME, {
      periodInMinutes: OUTBOX_DRAIN_PERIOD_MINUTES,
    });
  };

  const ensureMaintenanceAlarm = async () => {
    await alarms.create(OUTBOX_MAINTENANCE_ALARM_NAME, {
      periodInMinutes: OUTBOX_MAINTENANCE_PERIOD_MINUTES,
    });
  };

  const sync = async () => {
    const lifecycle = await lifecycleStore.get();
    const isLive = lifecycle.status === "recording" || lifecycle.status === "paused";
    const outstanding = await countOutstanding();

    if (isLive || outstanding > 0) {
      await ensureDrainAlarm();
      return;
    }

    await alarms.clear(OUTBOX_DRAIN_ALARM_NAME);
  };

  const runMaintenance = async () => {
    await repository.prune(now());
    await onMaintenance?.();
  };

  const start = async () => {
    await ensureDrainAlarm();
    await ensureMaintenanceAlarm();
  };

  const afterDrain = async () => {
    await sync();

    // Retention after every live capture would rescan the outbox constantly;
    // the stopped session is the point where the drain is actually finished.
    const lifecycle = await lifecycleStore.get();
    if (lifecycle.status === "stopped") {
      await runMaintenance();
    }
  };

  const handleAlarm = async (alarm: { name: string }) => {
    if (alarm.name === OUTBOX_DRAIN_ALARM_NAME) {
      await drainAll();
      await sync();
      return;
    }

    if (alarm.name === OUTBOX_MAINTENANCE_ALARM_NAME) {
      await runMaintenance();
    }
  };

  return { start, sync, runMaintenance, ensureMaintenanceAlarm, afterDrain, handleAlarm };
};

export type OutboxScheduler = ReturnType<typeof createOutboxScheduler>;
