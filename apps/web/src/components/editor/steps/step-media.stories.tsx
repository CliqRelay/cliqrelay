import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";

import { extensionRegistry } from "@repo/extensions-sdk";

import { StepMedia } from "./step-media";
import { ExtensionSlotKeys } from "@/constants/extension-slots";
import { makeCanvasStep, makeInteractionStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/StepMedia",
  component: StepMedia,
  args: { step: makeInteractionStep({ mediaAssets: [makeMediaAsset()] }) },
  beforeEach: () => {
    extensionRegistry.clear();
    return () => extensionRegistry.clear();
  },
} satisfies Meta<typeof StepMedia>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Screenshot: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: "Click the Save button" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const ScreenshotWithReplaceToolbar: Story = {
  args: { onReplaceMedia: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Replace screenshot" }),
    );
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
  },
};

export const ScreenshotWithRedactSlot: Story = {
  args: { onReplaceMedia: fn() },
  decorators: [
    (Story) => {
      extensionRegistry.install({
        id: "test",
        slots: [
          {
            name: ExtensionSlotKeys.STEP_MEDIA_TOOLBAR,
            component: () => <button>Redact</button>,
          },
        ],
        navItems: [],
      });
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Redact" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Replace screenshot" })).toBeInTheDocument();
  },
};

export const ReplacingShowsSpinner: Story = {
  args: { onReplaceMedia: fn(), isReplacing: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "Uploading…" })).toBeDisabled();
  },
};

export const CustomClassName: Story = {
  args: { className: "mt-3 mb-0" },
  play: async ({ canvasElement }) => {
    const wrapper = within(canvasElement).getByRole("img").parentElement;
    await expect(wrapper).toHaveClass("mt-3", "mb-0");
    await expect(wrapper).not.toHaveClass("mb-4");
  },
};

export const InteractionWithoutScreenshot: Story = {
  args: { step: makeInteractionStep() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No screenshot captured")).toBeInTheDocument();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const InteractionWithoutScreenshotCanUpload: Story = {
  args: { step: makeInteractionStep(), onReplaceMedia: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Upload screenshot" }));
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
  },
};

export const CanvasWithoutScreenshotRendersNothing: Story = {
  args: { step: makeCanvasStep(), onReplaceMedia: fn() },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-slot]")).not.toBeInTheDocument();
    await expect(
      within(canvasElement).queryByText("No screenshot captured"),
    ).not.toBeInTheDocument();
  },
};

const indicatorStep = (targetElement: Record<string, unknown> | undefined) =>
  makeInteractionStep({
    mediaAssets: [makeMediaAsset({ width: 2000, height: 1000 })],
    targetElement,
  });

export const IndicatorCanBeDragged: Story = {
  args: {
    step: indicatorStep({
      clickX: 1000,
      clickY: 500,
      viewportWidth: 2000,
      viewportHeight: 1000,
    }),
    onUpdate: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const indicator = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>("[data-slot='step-indicator']");
      if (!element) throw new Error("Indicator not rendered");
      return element;
    });
    const container = indicator.parentElement;
    if (!container) throw new Error("Indicator container missing");
    const rect = container.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const endX = startX + rect.width / 4;
    const endY = startY + rect.height / 10;

    fireEvent.pointerDown(indicator, { pointerId: 1, clientX: startX, clientY: startY });
    fireEvent.pointerMove(indicator, { pointerId: 1, clientX: endX, clientY: endY });
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await expect(args.onUpdate).not.toHaveBeenCalled();

    fireEvent.pointerUp(indicator, { pointerId: 1, clientX: endX, clientY: endY });

    await waitFor(() => expect(args.onUpdate).toHaveBeenCalledTimes(1));
    expect(args.onUpdate).toHaveBeenCalledWith("step-1", {
      targetElement: {
        clickX: 1500,
        clickY: 600,
        viewportWidth: 2000,
        viewportHeight: 1000,
      },
    });
  },
};

export const IndicatorCanBeHidden: Story = {
  args: {
    step: indicatorStep({
      clickX: 1000,
      clickY: 500,
      viewportWidth: 2000,
      viewportHeight: 1000,
    }),
    onUpdate: fn(),
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Hide indicator" }));

    await expect(args.onUpdate).toHaveBeenCalledWith("step-1", {
      targetElement: { viewportWidth: 2000, viewportHeight: 1000 },
    });
  },
};

export const IndicatorCanBeShown: Story = {
  args: {
    step: makeInteractionStep({
      mediaAssets: [makeMediaAsset({ width: 1000, height: 500 })],
      targetElement: { viewportWidth: 1000, viewportHeight: 500 },
    }),
    onUpdate: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: "Hide indicator" })).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Show indicator" }));

    await expect(args.onUpdate).toHaveBeenCalledWith("step-1", {
      targetElement: {
        clickX: 500,
        clickY: 250,
        viewportWidth: 1000,
        viewportHeight: 500,
      },
    });
  },
};

export const HiddenIndicatorRendersNoCircle: Story = {
  args: {
    step: indicatorStep({ viewportWidth: 2000, viewportHeight: 1000 }),
    onUpdate: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Show indicator" })).toBeInTheDocument();
    await expect(
      canvasElement.querySelector("[data-slot='step-indicator']"),
    ).not.toBeInTheDocument();
  },
};
