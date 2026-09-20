import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen, userEvent, within } from "storybook/test";

import { StepActionsMenu } from "./step-actions-menu";
import { Button } from "@/components/ui/button";
import { makeInteractionStep, makeMediaAsset } from "@/test/fixtures/steps";

const meta = {
  title: "Editor/Steps/StepActionsMenu",
  component: StepActionsMenu,
  args: {
    step: makeInteractionStep(),
    trigger: <Button>Open menu</Button>,
    onReplaceMedia: fn(),
    onDuplicate: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof StepActionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openMenu(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Open menu" }));
  return within(await screen.findByRole("menu"));
}

export const AllActions: Story = {
  play: async ({ canvasElement, args }) => {
    const menu = await openMenu(canvasElement);
    await expect(menu.getByRole("menuitem", { name: /Upload screenshot/ })).toBeInTheDocument();
    await expect(menu.getByRole("menuitem", { name: /Duplicate/ })).toBeInTheDocument();

    await userEvent.click(menu.getByRole("menuitem", { name: /Delete/ }));
    await expect(args.onDelete).toHaveBeenCalledTimes(1);
    await expect(args.onDuplicate).not.toHaveBeenCalled();
  },
};

export const ReplaceWhenStepHasMedia: Story = {
  args: { step: makeInteractionStep({ mediaAssets: [makeMediaAsset()] }) },
  play: async ({ canvasElement, args }) => {
    const menu = await openMenu(canvasElement);
    await userEvent.click(menu.getByRole("menuitem", { name: /Replace screenshot/ }));
    await expect(args.onReplaceMedia).toHaveBeenCalledTimes(1);
  },
};

export const ReplaceDisabledWhileUploading: Story = {
  args: { isReplacing: true },
  play: async ({ canvasElement }) => {
    const menu = await openMenu(canvasElement);
    await expect(menu.getByRole("menuitem", { name: /Upload screenshot/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};

export const OnlyProvidedActions: Story = {
  args: { onReplaceMedia: undefined, onDuplicate: undefined },
  play: async ({ canvasElement }) => {
    const menu = await openMenu(canvasElement);
    await expect(menu.getAllByRole("menuitem")).toHaveLength(1);
    await expect(menu.getByRole("menuitem", { name: /Delete/ })).toBeInTheDocument();
  },
};
