import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { failedCounts, pendingCounts } from "../__stories__/fixtures";
import { UploadStatusBadges } from "./UploadStatusBadges";
import { toUploadQueueInfo } from "@/models";

const meta = {
  title: "Sidepanel/UploadStatusBadges",
  component: UploadStatusBadges,
  args: {
    uploadQueue: toUploadQueueInfo(pendingCounts),
  },
} satisfies Meta<typeof UploadStatusBadges>;

export default meta;
type Story = StoryObj<typeof meta>;

export const QueuedAndUploading: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Uploads")).toBeVisible();
    await expect(canvas.getByText("3")).toBeVisible();
    await expect(canvas.getByText("1")).toBeVisible();
    await expect(canvas.getByText("12")).toBeVisible();
  },
};

export const WithFailures: Story = {
  args: {
    uploadQueue: toUploadQueueInfo(failedCounts),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("2")).toBeVisible();
    await expect(canvas.getByText("10")).toBeVisible();
  },
};

export const NothingToUpload: Story = {
  args: {
    uploadQueue: { pending: 0, inProgress: 0, failed: 0, completed: 0 },
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent?.trim()).toBe("");
  },
};
