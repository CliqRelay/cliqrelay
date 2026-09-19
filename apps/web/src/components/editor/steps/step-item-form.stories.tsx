import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { StepItemForm } from "./step-item-form";
import { makeCanvasStep, makeInteractionStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/StepItemForm",
  component: StepItemForm,
  args: { step: makeInteractionStep({ notes: "Some notes" }), index: 1, onUpdate: fn() },
} satisfies Meta<typeof StepItemForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interaction: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const actionText = canvas.getByPlaceholderText("e.g., Submit button, Email field");
    await expect(actionText).toHaveValue("Click the Save button");
    await expect(canvas.getByPlaceholderText("Internal notes about this step")).toHaveValue(
      "Some notes",
    );

    await userEvent.clear(actionText);
    await userEvent.type(actionText, "Press Save");
    await waitFor(() =>
      expect(args.onUpdate).toHaveBeenLastCalledWith("step-1", { actionText: "Press Save" }),
    );
  },
};

export const InteractionWithReplaceableMedia: Story = {
  args: {
    step: makeInteractionStep({ mediaAssets: [makeMediaAsset()] }),
    onReplaceMedia: fn(),
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Replace screenshot" }),
    );
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
  },
};

export const CanvasDelegatesToCanvasForm: Story = {
  args: { step: makeCanvasStep() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("combobox")).toHaveTextContent("Tip");
    await expect(
      canvas.queryByPlaceholderText("e.g., Submit button, Email field"),
    ).not.toBeInTheDocument();
  },
};
