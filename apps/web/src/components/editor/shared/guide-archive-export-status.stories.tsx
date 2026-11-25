import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen } from "storybook/test";

import { GuideArchiveExportStatus } from "./export-dialog";

const meta = {
  title: "Editor/ExportDialog/ArchiveStatus",
  component: GuideArchiveExportStatus,
  args: {
    status: "working",
    progress: { phase: "fetching", completed: 3, total: 12 },
    failures: [],
    onRetry: fn(),
    onDownloadAnyway: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof GuideArchiveExportStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FetchingScreenshots: Story = {
  play: async () => {
    await expect(await screen.findByText("Fetching screenshots 3/12")).toBeInTheDocument();
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  },
};

export const ScreenshotFailure: Story = {
  args: {
    status: "error",
    progress: null,
    failures: [
      { stepNumber: 7, message: "Screenshot failed with status 404" },
      { stepNumber: 9, message: "Network request failed" },
    ],
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
