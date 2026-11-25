import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { CanvasCodeBlock } from "./canvas-code-block";

const meta = {
  title: "Editor/Steps/CanvasCodeBlock",
  component: CanvasCodeBlock,
  args: {
    code: "const answer = 42;\nconsole.log(answer);",
    language: "typescript",
    caption: "example.ts",
    onClick: fn(),
  },
} satisfies Meta<typeof CanvasCodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HighlightedTokens: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvasElement.querySelector(".th-keyword")).not.toBeNull();
    await expect(canvas.getByText("TypeScript")).toBeInTheDocument();
    await expect(canvas.getByText("example.ts")).toBeInTheDocument();
  },
};

export const CopiesRawCode: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const writeText = fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await userEvent.click(canvas.getByRole("button", { name: "Copy code" }));

    await expect(writeText).toHaveBeenCalledWith(args.code);
    await expect(canvas.getByRole("button", { name: "Copied" })).toHaveTextContent("Copied");
  },
};

export const ClickSelectsBlock: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByText("example.ts"));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const CopyDoesNotSelectBlock: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const writeText = fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await userEvent.click(canvas.getByRole("button", { name: "Copy code" }));

    await expect(writeText).toHaveBeenCalled();
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const EmptyCodeShowsPlaceholder: Story = {
  args: { code: "" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("No code yet")).toBeInTheDocument();
  },
};
