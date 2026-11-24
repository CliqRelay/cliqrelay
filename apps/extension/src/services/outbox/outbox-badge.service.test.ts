import { beforeEach, describe, expect, test, vi } from "vitest";

import { createOutboxBadge, failedBadgeTitle, OUTBOX_BADGE_COLOR } from "./outbox-badge.service";

const setup = (failed: number) => {
  const action = {
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setTitle: vi.fn().mockResolvedValue(undefined),
  };
  const countFailed = vi.fn().mockResolvedValue(failed);
  const log = vi.fn();

  const badge = createOutboxBadge({ action, countFailed, log });

  return { badge, action, countFailed, log };
};

describe("outbox badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("clears the badge and title when nothing failed", async () => {
    const { badge, action } = setup(0);

    await badge.refresh();

    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "" });
    expect(action.setTitle).toHaveBeenCalledWith({ title: "" });
    expect(action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  test("shows the failed count in red with a describing title", async () => {
    const { badge, action } = setup(3);

    await badge.refresh();

    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "3" });
    expect(action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: OUTBOX_BADGE_COLOR });
    expect(action.setTitle).toHaveBeenCalledWith({ title: "3 steps failed to sync" });
  });

  test("uses the singular title for one failed step", async () => {
    const { badge, action } = setup(1);

    await badge.refresh();

    expect(action.setTitle).toHaveBeenCalledWith({ title: "1 step failed to sync" });
  });

  test("never throws when the toolbar API rejects", async () => {
    const { badge, action, log } = setup(2);
    action.setBadgeText.mockRejectedValue(new Error("no action api"));

    await expect(badge.refresh()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  test.each([
    [0, ""],
    [1, "1 step failed to sync"],
    [2, "2 steps failed to sync"],
  ])("formats the title for %s failed steps", (count, title) => {
    expect(failedBadgeTitle(count)).toBe(title);
  });
});
