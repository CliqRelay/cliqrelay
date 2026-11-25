import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, within } from "storybook/test";

import { CanvasCodeBlock } from "./canvas-code-block";

const longCode = Array.from(
  { length: 40 },
  (_, index) => `const value${index + 1} = compute(${index + 1});`,
).join("\n");

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

export const LongCodeIsCollapsedByDefault: Story = {
  args: { code: longCode },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Expand" });
    const codeArea = canvasElement.querySelector("[data-collapsed]");

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(codeArea).toHaveAttribute("data-collapsed", "true");
    await expect(codeArea?.contains(toggle)).toBe(true);
    await expect(toggle.parentElement).toHaveClass("absolute");
  },
};

export const ExpandingRevealsAllCode: Story = {
  args: { code: longCode },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Expand" }));

    await expect(canvas.getByRole("button", { name: "Collapse" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(canvasElement.querySelector("[data-collapsed]")).toHaveAttribute(
      "data-collapsed",
      "false",
    );
    const pre = canvasElement.querySelector("pre.th-code");

    await expect(pre).not.toBeNull();
    await expect(getComputedStyle(pre!).paddingBottom).toBe("56px");
  },
};

export const ShortCodeHasNoToggle: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("button", { name: /expand/i }),
    ).not.toBeInTheDocument();
  },
};

export const ToggleDoesNotSelectBlock: Story = {
  args: { code: longCode },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Expand" }));

    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
