const OUTBOX_BADGE_COLOR = "#dc2626";

const failedBadgeTitle = (count: number): string => {
  if (count === 0) {
    return "";
  }
  return count === 1 ? "1 step failed to sync" : `${count} steps failed to sync`;
};

type BadgeAction = {
  setBadgeText: (details: { text: string }) => Promise<void> | void;
  setBadgeBackgroundColor: (details: { color: string }) => Promise<void> | void;
  setTitle: (details: { title: string }) => Promise<void> | void;
};

type OutboxBadgeDeps = {
  action: BadgeAction;
  countFailed: () => Promise<number>;
  log?: (message: string, error: unknown) => void;
};

export const createOutboxBadge = ({
  action,
  countFailed,
  log = (message, error) => console.warn(message, error),
}: OutboxBadgeDeps) => {
  const refresh = async (): Promise<void> => {
    try {
      const count = await countFailed();

      if (count === 0) {
        await action.setBadgeText({ text: "" });
        await action.setTitle({ title: "" });
        return;
      }

      await action.setBadgeText({ text: String(count) });
      await action.setBadgeBackgroundColor({ color: OUTBOX_BADGE_COLOR });
      await action.setTitle({ title: failedBadgeTitle(count) });
    } catch (error) {
      log("[background] Failed to update the failed-sync badge:", error);
    }
  };

  return { refresh };
};

export type OutboxBadge = ReturnType<typeof createOutboxBadge>;
