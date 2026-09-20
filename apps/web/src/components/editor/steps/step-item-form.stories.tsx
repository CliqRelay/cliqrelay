import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import type { Step } from "@repo/api-client";

import { StepItemForm } from "./step-item-form";
import { makeCanvasStep, makeInteractionStep, makeMediaAsset } from "@/test/fixtures/steps";

function StaleRefetchHarness({ initialStep, staleStep }: { initialStep: Step; staleStep: Step }) {
  const [step, setStep] = useState(initialStep);
  return (
    <>
      <StepItemForm step={step} index={1} onUpdate={fn()} />
      <button type="button" onClick={() => setStep(staleStep)}>
        Simulate stale refetch
      </button>
    </>
  );
}

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

export const KeepsTypingWhenServerRefetchesStaleValue: Story = {
  render: () => (
    <StaleRefetchHarness
      initialStep={makeInteractionStep({ notes: "Some notes" })}
      staleStep={makeInteractionStep({ actionText: "abc", notes: "Some notes" })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const actionText = canvas.getByPlaceholderText("e.g., Submit button, Email field");
    const notes = canvas.getByPlaceholderText("Internal notes about this step");

    await userEvent.clear(actionText);
    await userEvent.type(actionText, "abcdef");
    await userEvent.clear(notes);
    await userEvent.type(notes, "Fresh notes");

    await userEvent.click(canvas.getByRole("button", { name: "Simulate stale refetch" }));

    await expect(actionText).toHaveValue("abcdef");
    await expect(notes).toHaveValue("Fresh notes");
  },
};
