import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen, userEvent, within } from "storybook/test";

import type { Step } from "@repo/api-client";

import { GuideWorkflowTimeline } from "./guide-workflow-timeline";
import { makeCanvasStep, makeInteractionStep } from "@/test/fixtures/steps";

const initialSteps: Step[] = [
  makeCanvasStep({ headingText: "First tip" }, { id: "step-1", sortOrder: "a0" }),
  makeCanvasStep(
    { type: "callout", headingText: "Second callout" },
    { id: "step-2", sortOrder: "a1" },
  ),
  makeInteractionStep({ id: "step-3", sortOrder: "a2", actionText: "Third step" }),
];

type HarnessProps = {
  initialSelectedStepId: string | null;
  onSelectStep: (stepId: string | null) => void;
  onUpdateStep: (stepId: string, updates: Record<string, unknown>) => void;
};

function TimelineHarness({ initialSelectedStepId, onSelectStep, onUpdateStep }: HarnessProps) {
  const [steps, setSteps] = useState(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState(initialSelectedStepId);

  return (
    <>
      <button type="button">Outside the timeline</button>
      <GuideWorkflowTimeline
        steps={steps}
        selectedStepId={selectedStepId}
        onSelectStep={(stepId) => {
          setSelectedStepId(stepId);
          onSelectStep(stepId);
        }}
        onUpdateStep={(stepId, updates) => {
          setSteps((all) => all.map((s) => (s.id === stepId ? ({ ...s, ...updates } as Step) : s)));
          onUpdateStep(stepId, updates);
        }}
      />
    </>
  );
}

const meta = {
  title: "Editor/Guides/GuideWorkflowTimeline",
  component: TimelineHarness,
  args: { initialSelectedStepId: null, onSelectStep: fn(), onUpdateStep: fn() },
} satisfies Meta<typeof TimelineHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RendersAllStepKinds: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("alert")).toHaveLength(2);
    await expect(canvas.getByRole("heading", { name: "Third step" })).toBeInTheDocument();
    await expect(canvas.getByText("1")).toBeInTheDocument();
  },
};

export const ClickOutsideDeselects: Story = {
  args: { initialSelectedStepId: "step-1" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("combobox")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Outside the timeline" }));
    await expect(args.onSelectStep).toHaveBeenCalledWith(null);
    await expect(canvas.queryByRole("combobox")).not.toBeInTheDocument();
  },
};

export const ChangingCanvasTypeKeepsSelection: Story = {
  args: { initialSelectedStepId: "step-1" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Alert" }));

    await expect(args.onUpdateStep).toHaveBeenCalledWith("step-1", {
      canvasContent: expect.objectContaining({ type: "alert" }),
    });
    await expect(args.onSelectStep).not.toHaveBeenCalled();
    await expect(await canvas.findByRole("combobox")).toHaveTextContent("Alert");
    await expect(canvas.getAllByRole("alert")[0]).toHaveClass("border-red-500");
  },
};

export const ActionsMenuKeepsSelection: Story = {
  args: { initialSelectedStepId: "step-1" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getAllByRole("button", { name: "Step actions" })[0]);
    await expect(await screen.findByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect(args.onSelectStep).not.toHaveBeenCalled();
    await expect(await canvas.findByRole("combobox")).toBeInTheDocument();
  },
};
