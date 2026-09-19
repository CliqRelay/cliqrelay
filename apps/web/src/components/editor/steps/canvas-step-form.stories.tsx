import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import { CanvasStepForm } from "./canvas-step-form";
import { makeCanvasStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/CanvasStepForm",
  component: CanvasStepForm,
  args: { step: makeCanvasStep(), onUpdate: fn() },
} satisfies Meta<typeof CanvasStepForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("combobox")).toHaveTextContent("Tip");
    await expect(canvas.getByPlaceholderText("Alert heading text")).toHaveValue(
      "Keep this in mind",
    );
    await expect(canvas.getByPlaceholderText("Markdown body text")).toHaveValue(
      "Some **markdown** body text.",
    );
  },
};

export const ChangeType: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Callout" }));
    await expect(args.onUpdate).toHaveBeenCalledWith("step-1", {
      canvasContent: {
        type: "callout",
        headingText: "Keep this in mind",
        bodyText: "Some **markdown** body text.",
      },
    });
  },
};

export const EditHeadingSavesDebounced: Story = {
  play: async ({ canvasElement, args }) => {
    const heading = within(canvasElement).getByPlaceholderText("Alert heading text");
    await userEvent.clear(heading);
    await userEvent.type(heading, "New heading");
    await waitFor(() =>
      expect(args.onUpdate).toHaveBeenLastCalledWith("step-1", {
        canvasContent: {
          type: "tip",
          headingText: "New heading",
          bodyText: "Some **markdown** body text.",
        },
      }),
    );
  },
};

export const HeaderHidesBodyAndMedia: Story = {
  args: {
    step: makeCanvasStep({ type: "header" }, { mediaAssets: [makeMediaAsset()] }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByPlaceholderText("Section heading")).toBeInTheDocument();
    await expect(canvas.queryByPlaceholderText("Markdown body text")).not.toBeInTheDocument();
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument();
  },
};

export const WithScreenshotAndReplace: Story = {
  args: {
    step: makeCanvasStep({}, { mediaAssets: [makeMediaAsset()] }),
    onReplaceMedia: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Replace screenshot" }));
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
  },
};
