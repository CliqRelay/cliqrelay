import type { OutboxRepository } from "./outbox.repository";
import type { OutboxAlarm, RecordingLifecycleStore, RecordingStatus } from "@/models";

export const OUTBOX_DRAIN_ALARM_NAME = "cliqrelay.outbox-drain";
export const OUTBOX_MAINTENANCE_ALARM_NAME = "cliqrelay.outbox-maintenance";

const OUTBOX_DRAIN_PERIOD_MINUTES = 1;
const OUTBOX_MAINTENANCE_PERIOD_MINUTES = 24 * 60;

type OutboxAlarms = {
  create: (name: string, info: { periodInMinutes: number }) => Promise<void> | void;
  clear: (name: string) => Promise<unknown> | unknown;
};

type OutboxSchedulerDeps = {
  alarms: OutboxAlarms;
  lifecycleStore: Pick<RecordingLifecycleStore, "get">;
  repository: Pick<OutboxRepository, "prune">;
  drainAll: () => Promise<void>;
  countOutstanding: () => Promise<number>;
  onMaintenance?: () => void | Promise<void>;
  now?: () => Date;
  log?: (message: string, details: Record<string, unknown>) => void;
};

export const createOutboxScheduler = ({
  alarms,
  lifecycleStore,
  repository,
  drainAll,
  countOutstanding,
  onMaintenance,
  now = () => new Date(),
  log = (message, details) => console.warn(message, details),
}: OutboxSchedulerDeps) => {
  const scheduleAlarm = (name: string, periodInMinutes: number) =>
    alarms.create(name, { periodInMinutes });

  const ensureDrainAlarm = () =>
    scheduleAlarm(OUTBOX_DRAIN_ALARM_NAME, OUTBOX_DRAIN_PERIOD_MINUTES);

  const ensureMaintenanceAlarm = () =>
    scheduleAlarm(OUTBOX_MAINTENANCE_ALARM_NAME, OUTBOX_MAINTENANCE_PERIOD_MINUTES);

  const sync = async (): Promise<RecordingStatus> => {
    const lifecycle = await lifecycleStore.get();

    if (lifecycle.status === "recording" || lifecycle.status === "paused") {
      await ensureDrainAlarm();
      return lifecycle.status;
    }

    try {
      if ((await countOutstanding()) > 0) {
        await ensureDrainAlarm();
      } else {
        await alarms.clear(OUTBOX_DRAIN_ALARM_NAME);
      }
    } catch (error) {
      log("[background] Failed to read the outbox backlog; keeping the drain alarm", {
        error: error instanceof Error ? error.message : String(error),
      });
      await ensureDrainAlarm();
    }

    return lifecycle.status;
  };

  const runMaintenance = async () => {
    await repository.prune(now());
    await onMaintenance?.();
  };

  const start = async () => {
    await Promise.all([ensureDrainAlarm(), ensureMaintenanceAlarm()]);
  };

  const afterDrain = async () => {
    const status = await sync();

    if (status === "stopped") {
      await runMaintenance();
    }
  };

  const handleAlarm = async (alarm: OutboxAlarm) => {
    if (alarm.name === OUTBOX_DRAIN_ALARM_NAME) {
      try {
        await drainAll();
      } finally {
        await sync();
      }
      return;
    }

    if (alarm.name === OUTBOX_MAINTENANCE_ALARM_NAME) {
      await runMaintenance();
    }
  };

  return { start, sync, runMaintenance, ensureMaintenanceAlarm, afterDrain, handleAlarm };
};

export type OutboxScheduler = ReturnType<typeof createOutboxScheduler>;
