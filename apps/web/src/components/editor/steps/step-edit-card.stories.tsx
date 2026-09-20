import type { Meta, StoryObj } from "@storybook/react-vite";

import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { expect, fn, screen, userEvent, within } from "storybook/test";

import { StepEditCard } from "./step-edit-card";
import { makeCanvasStep, makeInteractionStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/StepEditCard",
  component: StepEditCard,
  decorators: [
    (Story, { args }) => (
      <DndContext>
        <SortableContext items={[args.step.id]}>
          <Story />
        </SortableContext>
      </DndContext>
    ),
  ],
  args: {
    step: makeInteractionStep(),
    stepNumber: 1,
    selectedStepId: null,
    actions: {
      onSelect: fn(),
      onUpdate: fn(),
      onDelete: fn(),
      onDuplicate: fn(),
      onReplaceMedia: fn(),
      onAddStepBeforeWithType: fn(),
    },
  },
} satisfies Meta<typeof StepEditCard>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openActionsMenu(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Step actions" }));
  return within(await screen.findByRole("menu"));
}

export const InteractionStep: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Click the Save button" }),
    ).toBeInTheDocument();
    await expect(canvas.getByText("1")).toBeInTheDocument();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole("heading", { name: "Click the Save button" }));
    await expect(args.actions?.onSelect).toHaveBeenCalledWith("step-1");
  },
};

export const InteractionStepSelected: Story = {
  args: { selectedStepId: "step-1" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByPlaceholderText("e.g., Submit button, Email field")).toBeVisible();

    await userEvent.click(canvas.getByText("1"));
    await expect(args.actions?.onSelect).toHaveBeenCalledWith(null);
  },
};

export const InteractionStepMenu: Story = {
  play: async ({ canvasElement, args }) => {
    const menu = await openActionsMenu(canvasElement);
    await userEvent.click(menu.getByRole("menuitem", { name: /Duplicate/ }));
    await expect(args.actions?.onDuplicate).toHaveBeenCalledWith("step-1");
    await expect(args.actions?.onSelect).not.toHaveBeenCalled();
  },
};

export const CanvasTipHasNoCard: Story = {
  args: { step: makeCanvasStep() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector("[data-slot='card']")).not.toBeInTheDocument();
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveClass("border-blue-500");
    await expect(within(alert).getByRole("button", { name: "Step actions" })).toBeInTheDocument();

    await userEvent.click(canvas.getByText("Keep this in mind"));
    await expect(args.actions?.onSelect).toHaveBeenCalledWith("step-1");
  },
};

export const CanvasTipSelectedShowsFormInShell: Story = {
  args: { step: makeCanvasStep(), selectedStepId: "step-1" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveClass("ring-2");
    await expect(within(alert).getByRole("combobox")).toHaveTextContent("Tip");

    await userEvent.click(within(alert).getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Callout" }));
    await expect(args.actions?.onUpdate).toHaveBeenCalledWith("step-1", {
      canvasContent: expect.objectContaining({ type: "callout" }),
    });
    await expect(args.actions?.onSelect).not.toHaveBeenCalled();
  },
};

export const CanvasMenuUploadDoesNotSelect: Story = {
  args: { step: makeCanvasStep() },
  play: async ({ canvasElement, args }) => {
    const menu = await openActionsMenu(canvasElement);
    await userEvent.click(menu.getByRole("menuitem", { name: /Upload screenshot/ }));
    await expect(args.actions?.onSelect).not.toHaveBeenCalled();
  },
};

export const CanvasWithScreenshotInsideShell: Story = {
  args: { step: makeCanvasStep({}, { mediaAssets: [makeMediaAsset()] }) },
  play: async ({ canvasElement }) => {
    const alert = within(canvasElement).getByRole("alert");
    await expect(within(alert).getByRole("img")).toBeInTheDocument();
    await expect(
      within(alert).getByRole("button", { name: "Replace screenshot" }),
    ).toBeInTheDocument();
  },
};

export const CanvasHeaderKeepsCard: Story = {
  args: { step: makeCanvasStep({ type: "header", headingText: "Section title" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector("[data-slot='card']")).toBeInTheDocument();
    await expect(canvas.getByRole("heading", { name: "Section title" })).toBeInTheDocument();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

export const AddStepBeforeDock: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: /Add Step/ }),
    ).toBeInTheDocument();
  },
};
