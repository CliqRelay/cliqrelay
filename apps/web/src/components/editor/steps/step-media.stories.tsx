import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { StepMedia } from "./step-media";
import { makeCanvasStep, makeInteractionStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/StepMedia",
  component: StepMedia,
  args: { step: makeInteractionStep({ mediaAssets: [makeMediaAsset()] }) },
} satisfies Meta<typeof StepMedia>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Screenshot: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: "Click the Save button" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const ScreenshotWithReplaceToolbar: Story = {
  args: { onReplaceMedia: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Replace screenshot" }),
    );
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
  },
};

export const ReplacingShowsSpinner: Story = {
  args: { onReplaceMedia: fn(), isReplacing: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "Uploading…" })).toBeDisabled();
  },
};

export const CustomClassName: Story = {
  args: { className: "mt-3 mb-0" },
  play: async ({ canvasElement }) => {
    const wrapper = within(canvasElement).getByRole("img").parentElement;
    await expect(wrapper).toHaveClass("mt-3", "mb-0");
    await expect(wrapper).not.toHaveClass("mb-4");
  },
};

export const InteractionWithoutScreenshot: Story = {
  args: { step: makeInteractionStep() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No screenshot captured")).toBeInTheDocument();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const InteractionWithoutScreenshotCanUpload: Story = {
  args: { step: makeInteractionStep(), onReplaceMedia: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Upload screenshot" }));
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
  },
};

export const CanvasWithoutScreenshotRendersNothing: Story = {
  args: { step: makeCanvasStep(), onReplaceMedia: fn() },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-slot]")).not.toBeInTheDocument();
    await expect(
      within(canvasElement).queryByText("No screenshot captured"),
    ).not.toBeInTheDocument();
  },
};
