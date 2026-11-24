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
};

/**
 * Worker boot: clear offscreen-era keys, recover uploads a killed worker left
 * mid-flight, restore the live session, then drain whatever the user still has.
 */
export const createOutboxBoot = ({
  repository,
  scheduler,
  drainer,
  badge,
  runLegacyCleanup,
  restoreRecording,
}: OutboxBootDeps) => {
  return async (): Promise<RecordingStatus> => {
    await runLegacyCleanup();
    await repository.resetStaleUploading();
    await scheduler.ensureMaintenanceAlarm();

    const status = await restoreRecording();

    await badge.refresh();
    await drainer.drainAll();
    await scheduler.sync();
    await scheduler.runMaintenance();

    return status;
  };
};

export type OutboxBoot = ReturnType<typeof createOutboxBoot>;
