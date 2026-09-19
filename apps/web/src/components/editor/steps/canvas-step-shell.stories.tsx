import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { CanvasStepShell } from "./canvas-step-shell";
import { StepMediaToolbar, StepMediaToolbarButton } from "./step-media-toolbar";

const meta = {
  title: "Editor/Steps/CanvasStepShell",
  component: CanvasStepShell,
  args: {
    type: "tip",
    children: <p>Shell content</p>,
  },
} satisfies Meta<typeof CanvasStepShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tip: Story = {
  play: async ({ canvasElement }) => {
    const alert = within(canvasElement).getByRole("alert");
    await expect(alert).toHaveClass("border-blue-500");
    await expect(alert.querySelector("svg")).toHaveAttribute("width", "30");
  },
};

export const Callout: Story = {
  args: { type: "callout" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveClass("border-gray-500");
  },
};

export const Alert: Story = {
  args: { type: "alert" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveClass("border-red-500");
  },
};

export const UnknownTypeFallsBackToTip: Story = {
  args: { type: "unknown" },
  play: async ({ canvasElement }) => {
    const alert = within(canvasElement).getByRole("alert");
    await expect(alert).not.toHaveClass("border-blue-500");
    await expect(alert.querySelector("svg")).toBeInTheDocument();
  },
};

export const WithToolbar: Story = {
  args: {
    onClick: fn(),
    toolbar: (
      <StepMediaToolbar visible>
        <StepMediaToolbarButton label="Toolbar action" icon={<span>★</span>} onClick={fn()} />
      </StepMediaToolbar>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Toolbar action" }));
    await expect(args.onClick).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByText("Shell content"));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
