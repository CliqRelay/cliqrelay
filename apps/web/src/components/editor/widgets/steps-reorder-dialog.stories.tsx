import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import { StepsReorderDialog } from "./steps-reorder-dialog";
import { makeCanvasStep, makeInteractionStep } from "@/test/fixtures/steps";

const steps = [
  makeInteractionStep({ id: "step-1", sortOrder: "a0", actionText: "First step" }),
  makeInteractionStep({ id: "step-2", sortOrder: "a1", actionText: "Second step" }),
  makeInteractionStep({ id: "step-3", sortOrder: "a2", actionText: "Third step" }),
];

const meta = {
  title: "Editor/Widgets/StepsReorderDialog",
  component: StepsReorderDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    steps,
    stepsLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    onLoadMore: fn(),
    onReorderSteps: fn(),
    onRevealStep: fn(),
  },
  render: function Render(args) {
    const [open, setOpen] = useState(true);

    return <StepsReorderDialog {...args} open={open} onOpenChange={setOpen} />;
  },
} satisfies Meta<typeof StepsReorderDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function findDialog() {
  return screen.findByRole("dialog", { name: "Reorder steps" });
}

export const ListsSteps: Story = {
  play: async () => {
    const dialog = await findDialog();

    const titles = within(dialog)
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) => /First step|Second step|Third step/.test(text ?? ""));

    await expect(titles).toEqual(["1First step", "2Second step", "3Third step"]);
  },
};

export const SkipsNumberingForCanvasSteps: Story = {
  args: {
    steps: [
      makeInteractionStep({ id: "step-1", sortOrder: "a0", actionText: "First step" }),
      makeCanvasStep({ headingText: "A tip" }, { id: "step-2", sortOrder: "a1" }),
      makeInteractionStep({ id: "step-3", sortOrder: "a2", actionText: "Second step" }),
    ],
  },
  play: async () => {
    const dialog = await findDialog();

    const titles = within(dialog)
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) => /First step|Second step|A tip/.test(text ?? ""));

    await expect(titles).toEqual(["1First step", "A tip", "2Second step"]);
  },
};

export const ShowsEmptyState: Story = {
  args: { steps: [] },
  play: async () => {
    const dialog = await findDialog();

    await expect(within(dialog).getByText("No steps to reorder yet.")).toBeInTheDocument();
  },
};

export const ShowsSpinnerWhileLoadingMore: Story = {
  args: { hasNextPage: true, isFetchingNextPage: true },
  play: async () => {
    const dialog = await findDialog();

    await expect(await within(dialog).findByLabelText("Loading")).toBeInTheDocument();
  },
};

export const ClickingCardRevealsAndCloses: Story = {
  play: async ({ args }) => {
    const dialog = await findDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: /First step/ }));

    await waitFor(() => expect(args.onRevealStep).toHaveBeenCalledWith("step-1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const KeyboardReorderMovesTheStep: Story = {
  play: async ({ args }) => {
    const dialog = await findDialog();
    const handle = within(dialog).getByRole("button", { name: "Reorder step 1" });

    handle.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard(" ");

    await waitFor(() =>
      expect(args.onReorderSteps).toHaveBeenCalledWith("step-1", "step-2", "step-3"),
    );
  },
};

export const DragOverlayEscapesTheDialogTransform: Story = {
  play: async () => {
    const dialog = await findDialog();
    const handle = within(dialog).getByRole("button", { name: "Reorder step 1" });

    handle.focus();
    await userEvent.keyboard(" ");

    const overlay = await waitFor(() => {
      const element = document.querySelector("[data-dnd-overlay]");
      expect(element).toBeInTheDocument();
      return element;
    });

    // DialogContent is translated, which would offset a fixed-position overlay.
    await expect(overlay?.closest("[data-slot='dialog-content']")).toBeNull();

    await userEvent.keyboard(" ");
  },
};
