import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { CanvasStepPreview } from "./canvas-step-preview";
import { makeCanvasStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/CanvasStepPreview",
  component: CanvasStepPreview,
  args: { step: makeCanvasStep() },
} satisfies Meta<typeof CanvasStepPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tip: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveClass("border-blue-500");
    await expect(canvas.getByText("Keep this in mind")).toBeInTheDocument();
    await expect(canvas.getByText("markdown")).toHaveProperty("tagName", "STRONG");
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument();
  },
};

export const Callout: Story = {
  args: { step: makeCanvasStep({ type: "callout" }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveClass("border-gray-500");
  },
};

export const Alert: Story = {
  args: { step: makeCanvasStep({ type: "alert" }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveClass("border-red-500");
  },
};

export const Header: Story = {
  args: { step: makeCanvasStep({ type: "header", headingText: "Section title" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Section title" })).toBeInTheDocument();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

export const WithScreenshotInsideShell: Story = {
  args: { step: makeCanvasStep({}, { mediaAssets: [makeMediaAsset()] }) },
  play: async ({ canvasElement }) => {
    const alert = within(canvasElement).getByRole("alert");
    const image = within(alert).getByRole("img", { name: "Keep this in mind" });
    await expect(image).toBeInTheDocument();
    await expect(alert.contains(image)).toBe(true);
  },
};

export const ReplaceScreenshotFromImage: Story = {
  args: {
    step: makeCanvasStep({}, { mediaAssets: [makeMediaAsset()] }),
    onReplaceMedia: fn(),
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole("button", { name: "Replace screenshot" });
    await userEvent.click(button);
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const ClickSelects: Story = {
  args: { onClick: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByText("Keep this in mind"));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const NoCanvasContentRendersNothing: Story = {
  args: { step: makeCanvasStep({}, { canvasContent: null }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("alert")).not.toBeInTheDocument();
  },
};
