import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen } from "storybook/test";

import { ExportStatus } from "./export-status";
import type { GuideExportController } from "@/models";

const createController = (
  overrides: Partial<GuideExportController> = {},
): GuideExportController => ({
  status: "running",
  progress: { label: "Fetching screenshots 3/12", completed: 3, total: 12 },
  error: null,
  config: null,
  startLabel: "Download",
  runningLabel: "Preparing export...",
  doneLabel: "Export ready.",
  startDisabled: false,
  start: fn(),
  cancel: fn(),
  ...overrides,
});

const meta = {
  title: "Editor/ExportDialog/Status",
  component: ExportStatus,
  args: {
    controller: createController(),
  },
} satisfies Meta<typeof ExportStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FetchingScreenshots: Story = {
  play: async () => {
    await expect(await screen.findByText("Fetching screenshots 3/12")).toBeInTheDocument();
  },
};

export const ScreenshotFailure: Story = {
  args: {
    controller: createController({
      status: "error",
      progress: null,
      error: {
        title: "Some screenshots could not be fetched.",
        messages: ["Step 7: Screenshot failed with status 404", "Step 9: Network request failed"],
        actions: [
          { label: "Retry", onClick: fn() },
          {
            label: "Download without missing screenshots",
            variant: "outline",
            onClick: fn(),
          },
        ],
      },
    }),
  },
  play: async () => {
    await expect(
      await screen.findByText("Step 7: Screenshot failed with status 404"),
    ).toBeVisible();
    await expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(
      screen.getByRole("button", { name: "Download without missing screenshots" }),
    ).toBeVisible();
  },
};

export const Done: Story = {
  args: {
    controller: createController({
      status: "done",
      progress: null,
      doneLabel: "ZIP backup downloaded.",
    }),
  },
  play: async () => {
    await expect(await screen.findByText("ZIP backup downloaded.")).toBeVisible();
  },
};
