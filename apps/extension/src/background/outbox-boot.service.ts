import type { RecordingStatus } from "@/models";
import type { OutboxBadge } from "@/services/outbox/outbox-badge.service";
import type { OutboxDrainer } from "@/services/outbox/outbox-drainer.service";
import type { OutboxScheduler } from "@/services/outbox/outbox-scheduler.service";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";

type OutboxBootDeps = {
  repository: Pick<OutboxRepository, "resetStaleUploading">;
  scheduler: Pick<OutboxScheduler, "ensureMaintenanceAlarm" | "sync" | "runMaintenance">;
  drainer: Pick<OutboxDrainer, "drainAll">;
  badge: Pick<OutboxBadge, "refresh">;
  runLegacyCleanup: () => Promise<void>;
  restoreRecording: () => Promise<RecordingStatus>;
  log?: (message: string, error: unknown) => void;
};

export const createOutboxBoot = ({
  repository,
  scheduler,
  drainer,
  badge,
  runLegacyCleanup,
  restoreRecording,
  log = (message, error) => console.warn(message, error),
}: OutboxBootDeps) => {
  let bootRun: Promise<RecordingStatus> | undefined;

  const boot = async (): Promise<RecordingStatus> => {
    await runLegacyCleanup();
    await repository.resetStaleUploading();
    await scheduler.ensureMaintenanceAlarm();

    const status = await restoreRecording();

    await scheduler.runMaintenance();

    try {
      await drainer.drainAll();
    } finally {
      try {
        await scheduler.sync();
      } catch (error) {
        log("[background] Failed to reconcile the outbox alarm after boot:", error);
      }
      await badge.refresh();
    }

    return status;
  };

  return (): Promise<RecordingStatus> => {
    bootRun ??= boot().catch((error: unknown) => {
      bootRun = undefined;
      throw error;
    });

    return bootRun;
  };
};

export type OutboxBoot = ReturnType<typeof createOutboxBoot>;
