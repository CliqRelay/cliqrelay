import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import {
  failedCounts,
  failedStep,
  pendingCounts,
  pendingStep,
  syncedStep,
  uploadingStep,
} from "../__stories__/fixtures";
import { CaptureSessionPanel } from "./CaptureSessionPanel";
import { toUploadQueueInfo } from "@/models";

const noop = () => {};
const asyncNoop = async () => {};

const meta = {
  title: "Sidepanel/CaptureSessionPanel",
  component: CaptureSessionPanel,
  decorators: [
    (Story) => (
      <div className="flex h-[560px] flex-col">
        <Story />
      </div>
    ),
  ],
  args: {
    status: "recording",
    steps: [pendingStep, uploadingStep, syncedStep],
    uploadQueue: toUploadQueueInfo(pendingCounts),
    isDraining: false,
    guideId: "guide-1",
    stepCount: 3,
    isPending: false,
    error: null,
    onPause: asyncNoop,
    onResume: asyncNoop,
    onStop: asyncNoop,
    onDeleteStep: noop,
    onDismiss: noop,
    onRetryFailed: noop,
    onDeleteGuide: noop,
  },
} satisfies Meta<typeof CaptureSessionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Recording: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Recording")).toBeVisible();
    await expect(canvas.getByText("3 steps")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Complete capture" })).toBeEnabled();
  },
};

export const Paused: Story = {
  args: {
    status: "paused",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Paused")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Resume capture" })).toBeVisible();
  },
};

export const Draining: Story = {
  args: {
    status: "stopped",
    isDraining: true,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Finalizing uploads…")).toBeVisible();
  },
};

export const FailedWithRetry: Story = {
  args: {
    status: "recording",
    steps: [pendingStep, failedStep],
    uploadQueue: toUploadQueueInfo(failedCounts),
    stepCount: 2,
    onRetryFailed: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const retry = canvas.getByRole("button", { name: "Retry 2 failed steps" });

    await expect(canvas.getByText("Failed")).toBeVisible();
    await userEvent.click(retry);
    await expect(args.onRetryFailed).toHaveBeenCalledTimes(1);
  },
};
