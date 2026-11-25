import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen } from "storybook/test";

import { ImportGuideResultSummary } from "./import-guide-dialog";

const meta = {
  title: "Guides/ImportGuideDialog/ResultSummary",
  component: ImportGuideResultSummary,
  args: {
    result: {
      guideId: "guide-1",
      title: "Checkout flow",
      importedSteps: 12,
      totalSteps: 12,
      importedMedia: 10,
      skippedMedia: 0,
      warnings: [],
      partial: false,
    },
    error: null,
    onOpenGuide: fn(),
    onImportAnother: fn(),
  },
} satisfies Meta<typeof ImportGuideResultSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  play: async () => {
    await expect(await screen.findByText("Imported 12 of 12 steps.")).toBeVisible();
    await expect(screen.getByRole("button", { name: "Open guide" })).toBeVisible();
  },
};

export const PartialWithWarnings: Story = {
  args: {
    result: {
      guideId: "guide-1",
      title: "Checkout flow",
      importedSteps: 11,
      totalSteps: 12,
      importedMedia: 9,
      skippedMedia: 1,
      warnings: [
        "Step 7 screenshot could not be restored. The step was imported without an image.",
      ],
      partial: true,
    },
  },
  play: async () => {
    await expect(await screen.findByText("Imported 11 of 12 steps.")).toBeVisible();
    await expect(
      screen.getByText(
        "Step 7 screenshot could not be restored. The step was imported without an image.",
      ),
    ).toBeVisible();
  },
};

export const StoppedEarly: Story = {
  args: {
    result: {
      guideId: "guide-1",
      title: "Checkout flow",
      importedSteps: 5,
      totalSteps: 12,
      importedMedia: 0,
      skippedMedia: 7,
      warnings: [],
      partial: true,
    },
    error: "The guide steps could not be created.",
  },
  play: async () => {
    await expect(await screen.findByText("Import stopped early")).toBeVisible();
    await expect(screen.getByText("The guide steps could not be created.")).toBeVisible();
  },
};
