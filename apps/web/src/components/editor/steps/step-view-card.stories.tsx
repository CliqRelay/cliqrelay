import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { GuideWorkflowViewStep } from "./step-view-card";
import { makeInteractionStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/StepViewCard",
  component: GuideWorkflowViewStep,
  args: { step: makeInteractionStep(), stepNumber: 1 },
} satisfies Meta<typeof GuideWorkflowViewStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotesWithoutMedia: Story = {
  args: {
    step: makeInteractionStep({ notes: "This button saves the draft." }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("This button saves the draft.")).toBeInTheDocument();
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument();
    await expect(canvas.queryByText("No screenshot captured")).not.toBeInTheDocument();
  },
};

export const NotesWithMedia: Story = {
  args: {
    step: makeInteractionStep({
      notes: "This button saves the draft.",
      mediaAssets: [makeMediaAsset()],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toBeInTheDocument();
    await expect(canvas.getByText("This button saves the draft.")).toBeInTheDocument();
  },
};

export const WithoutNotes: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".whitespace-pre-line")).not.toBeInTheDocument();
  },
};

export const BlankNotes: Story = {
  args: {
    step: makeInteractionStep({ notes: "   " }),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".whitespace-pre-line")).not.toBeInTheDocument();
  },
};

export const MultilineNotes: Story = {
  args: {
    step: makeInteractionStep({ notes: "First line\nSecond line" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/First line/)).toHaveClass("whitespace-pre-line");
  },
};
