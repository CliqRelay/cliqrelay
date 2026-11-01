import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import type { Guide } from "@repo/api-client";

import { StepsReorderWidget } from "./steps-reorder-widget";
import { makeCanvasStep, makeInteractionStep } from "@/test/fixtures/steps";

const guide: Guide = {
  id: "guide-1",
  title: "Test guide",
  status: "draft",
  visibility: "private",
  creatorId: null,
  durationSeconds: 0,
  isStarred: false,
  teamId: "team-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const steps = [
  makeInteractionStep({ id: "step-1", sortOrder: "a0", actionText: "First step" }),
  makeInteractionStep({ id: "step-2", sortOrder: "a1", actionText: "Second step" }),
  makeInteractionStep({ id: "step-3", sortOrder: "a2", actionText: "Third step" }),
];

const meta = {
  title: "Editor/Widgets/StepsReorderWidget",
  component: StepsReorderWidget,
  args: {
    guide,
    steps,
    stepsLoading: false,
    selectedStepId: null,
    onSelectStep: fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    onLoadMore: fn(),
    onReorderSteps: fn(),
    onRevealStep: fn(),
  },
} satisfies Meta<typeof StepsReorderWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openDialog(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Reorder steps" }));
  return screen.findByRole("dialog", { name: "Reorder steps" });
}

export const OpensDialogAndListsSteps: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

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
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

    const titles = within(dialog)
      .getAllByRole("button")
      .map((button) => button.textContent)
      .filter((text) => /First step|Second step|A tip/.test(text ?? ""));

    await expect(titles).toEqual(["1First step", "A tip", "2Second step"]);
  },
};

export const ShowsEmptyState: Story = {
  args: { steps: [] },
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

    await expect(within(dialog).getByText("No steps to reorder yet.")).toBeInTheDocument();
  },
};

export const ShowsSpinnerWhileLoadingMore: Story = {
  args: { hasNextPage: true, isFetchingNextPage: true },
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);

    await expect(await within(dialog).findByLabelText("Loading")).toBeInTheDocument();
  },
};

export const ClickingCardRevealsAndCloses: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = await openDialog(canvasElement);

    await userEvent.click(within(dialog).getByRole("button", { name: /First step/ }));

    await waitFor(() => expect(args.onRevealStep).toHaveBeenCalledWith("step-1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const KeyboardReorderMovesTheStep: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = await openDialog(canvasElement);
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
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);
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
