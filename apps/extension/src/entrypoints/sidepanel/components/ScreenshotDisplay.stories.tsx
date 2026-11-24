import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, waitFor, within } from "storybook/test";

import { screenshotDataUrl, thumbnailDataUrl } from "../__stories__/fixtures";
import { ScreenshotDisplay } from "./ScreenshotDisplay";

const meta = {
  title: "Sidepanel/ScreenshotDisplay",
  component: ScreenshotDisplay,
  args: {
    screenshotUrl: screenshotDataUrl,
    thumbnail: thumbnailDataUrl,
    viewportWidth: 320,
    viewportHeight: 200,
  },
} satisfies Meta<typeof ScreenshotDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DataUrlWithThumbnail: Story = {
  args: {
    clickX: 150,
    clickY: 120,
  },
  play: async ({ canvasElement }) => {
    const screenshot = within(canvasElement).getByAltText("Screenshot");
    await expect(screenshot).toHaveAttribute("src", screenshotDataUrl);
    await waitFor(() => expect(screenshot).toHaveClass("opacity-100"));
  },
};

export const DataUrlOnly: Story = {
  args: {
    thumbnail: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const screenshot = canvas.getByAltText("Screenshot");
    await expect(screenshot).toHaveAttribute("src", screenshotDataUrl);
    await waitFor(() => expect(screenshot).toHaveClass("opacity-100"));
  },
};

export const BrokenSource: Story = {
  args: {
    screenshotUrl: "data:image/png;base64,not-an-image",
    thumbnail: undefined,
  },
  play: async ({ canvasElement }) => {
    const fallback = await within(canvasElement).findByText("Screenshot unavailable");
    await expect(fallback).toBeVisible();
  },
};
