export const OUTBOX_BADGE_COLOR = "#dc2626";

export const failedBadgeTitle = (count: number): string => {
  if (count === 0) {
    return "";
  }
  return count === 1 ? "1 step failed to sync" : `${count} steps failed to sync`;
};

export type BadgeAction = {
  setBadgeText: (details: { text: string }) => Promise<void> | void;
  setBadgeBackgroundColor: (details: { color: string }) => Promise<void> | void;
  setTitle: (details: { title: string }) => Promise<void> | void;
};

type OutboxBadgeDeps = {
  action: BadgeAction;
  countFailed: () => Promise<number>;
  log?: (message: string, error: unknown) => void;
};

/**
 * Only failed steps reach the toolbar: pending work is normal and synced work
 * needs no attention. Refreshed on failure, retry, discard and boot.
 */
export const createOutboxBadge = ({
  action,
  countFailed,
  log = (message, error) => console.warn(message, error),
}: OutboxBadgeDeps) => {
  const refresh = async (): Promise<void> => {
    try {
      const count = await countFailed();

      await action.setBadgeText({ text: count > 0 ? String(count) : "" });

      if (count === 0) {
        await action.setTitle({ title: failedBadgeTitle(0) });
        return;
      }

      await action.setBadgeBackgroundColor({ color: OUTBOX_BADGE_COLOR });
      await action.setTitle({ title: failedBadgeTitle(count) });
    } catch (error) {
      log("[background] Failed to update the failed-sync badge:", error);
    }
  };

  return { refresh };
};

export type OutboxBadge = ReturnType<typeof createOutboxBadge>;
