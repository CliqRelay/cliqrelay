import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { StepListItem } from "./step-list-item";
import { makeCanvasStep, makeInteractionStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/StepListItem",
  component: StepListItem,
  args: { step: makeInteractionStep({ mediaAssets: [makeMediaAsset()] }) },
} satisfies Meta<typeof StepListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InteractionShowsMedia: Story = {
  args: { onReplaceMedia: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Replace screenshot" }));
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
  },
};

export const CanvasShowsPreview: Story = {
  args: { step: makeCanvasStep({ type: "alert" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveClass("border-red-500");
    await expect(canvas.getByText("Keep this in mind")).toBeInTheDocument();
  },
};
