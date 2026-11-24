import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, within } from "storybook/test";

import {
  emptyCounts,
  failedCounts,
  failedSessionSummary,
  pendingCounts,
  settings,
  syncedSessionSummary,
} from "../__stories__/fixtures";
import { SettingsView } from "./SettingsView";

const meta = {
  title: "Sidepanel/SettingsView",
  component: SettingsView,
  args: {
    settings,
    onUpdate: fn(),
    localSync: {
      counts: pendingCounts,
      sessions: [syncedSessionSummary],
      otherSessions: [],
      onRetryFailed: fn(),
      onDiscardSession: fn(),
      onDiscardUserData: fn(),
    },
  },
} satisfies Meta<typeof SettingsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("There are no settings to configure yet.")).toBeVisible();
    await expect(canvas.getByText("Local sync")).toBeVisible();
    await expect(canvas.getByText("Synced")).toBeVisible();
  },
};

export const WithFailedLocalSteps: Story = {
  args: {
    localSync: {
      counts: failedCounts,
      sessions: [failedSessionSummary],
      otherSessions: [],
      onRetryFailed: fn(),
      onDiscardSession: fn(),
      onDiscardUserData: fn(),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("2 steps failed to sync")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Retry all failed" })).toBeVisible();
  },
};

export const NoLocalData: Story = {
  args: {
    localSync: {
      counts: emptyCounts,
      sessions: [],
      otherSessions: [],
      onRetryFailed: fn(),
      onDiscardSession: fn(),
      onDiscardUserData: fn(),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Nothing stored locally")).toBeVisible();
  },
};

export const LoadingSettings: Story = {
  args: {
    settings: undefined,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Loading settings...")).toBeVisible();
  },
};
