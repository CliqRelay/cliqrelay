import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { pendingStep, syncedStep } from "../__stories__/fixtures";
import { StepCardRecording } from "./StepCardRecording";

const meta = {
  title: "Sidepanel/StepCardRecording",
  component: StepCardRecording,
  args: {
    step: syncedStep,
    stepNumber: 1,
    onDelete: fn(),
    onDismiss: fn(),
  },
} satisfies Meta<typeof StepCardRecording>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeletingSyncedStepUsesLocalId: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole("button", { name: "Step actions" }));
    await userEvent.click(body.getByRole("menuitem", { name: "Delete" }));

    await expect(args.onDelete).toHaveBeenCalledWith(syncedStep.jobId, syncedStep.actionText);
    await expect(args.onDismiss).not.toHaveBeenCalled();
  },
};

export const DismissingPendingStepUsesLocalId: Story = {
  args: {
    step: pendingStep,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole("button", { name: "Step actions" }));
    await userEvent.click(body.getByRole("menuitem", { name: "Dismiss" }));

    await expect(args.onDismiss).toHaveBeenCalledWith(pendingStep.jobId);
    await expect(args.onDelete).not.toHaveBeenCalled();
  },
};
