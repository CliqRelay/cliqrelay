import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen, userEvent, within } from "storybook/test";

import {
  emptyCounts,
  failedCounts,
  failedSessionSummary,
  otherAccountSession,
  pendingCounts,
  syncedSessionSummary,
} from "../__stories__/fixtures";
import { LocalSyncSection } from "./LocalSyncSection";

const meta = {
  title: "Sidepanel/LocalSyncSection",
  component: LocalSyncSection,
  args: {
    counts: pendingCounts,
    sessions: [syncedSessionSummary],
    otherSessions: [],
    onRetryFailed: fn(),
    onDiscardSession: fn(),
    onDiscardUserData: fn(),
  },
} satisfies Meta<typeof LocalSyncSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Counts: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Pending")).toBeVisible();
    await expect(canvas.getByText("Uploading")).toBeVisible();
    await expect(canvas.getByText("Synced")).toBeVisible();
    await expect(canvas.getByText("Failed")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Discard local captures" })).toBeVisible();
  },
};

export const Failed: Story = {
  args: {
    counts: failedCounts,
    sessions: [failedSessionSummary],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("2 steps failed to sync")).toBeVisible();
    await expect(canvas.getByText("Presigned upload expired")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Retry failed" }));
    await expect(args.onRetryFailed).toHaveBeenCalledWith(failedSessionSummary.session.id);
  },
};

export const OtherAccount: Story = {
  args: {
    counts: emptyCounts,
    sessions: [],
    otherSessions: [otherAccountSession],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("Captures from another account")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Discard" }));

    const dialog = await screen.findByRole("alertdialog", {
      name: "Discard this session?",
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "Discard" }));

    await expect(args.onDiscardSession).toHaveBeenCalledWith(otherAccountSession.id);
  },
};

export const Empty: Story = {
  args: {
    counts: emptyCounts,
    sessions: [],
    otherSessions: [],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Nothing stored locally")).toBeVisible();
  },
};

export const DiscardConfirmation: Story = {
  args: {
    counts: pendingCounts,
    sessions: [syncedSessionSummary],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Discard local captures" }));

    await expect(
      await screen.findByRole("alertdialog", { name: "Discard local captures?" }),
    ).toBeVisible();
  },
};
