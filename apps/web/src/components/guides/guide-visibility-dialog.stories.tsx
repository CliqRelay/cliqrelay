import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen, userEvent } from "storybook/test";

import { GuideVisibilityDialog } from "./guide-visibility-dialog";
import { PUBLIC_DRAFT_HINT } from "@/models";

const meta = {
  title: "Guides/GuideVisibilityDialog",
  component: GuideVisibilityDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    visibility: "team",
    status: "draft",
    canSetPrivate: true,
    onSave: fn(),
  },
} satisfies Meta<typeof GuideVisibilityDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DraftWarnsPublicNeedsPublishing: Story = {
  play: async () => {
    await expect(await screen.findByText(PUBLIC_DRAFT_HINT)).toBeInTheDocument();
  },
};

export const PublishedHasNoPublishWarning: Story = {
  args: { status: "published" },
  play: async () => {
    await expect(await screen.findByText("Anyone with the link can view")).toBeInTheDocument();
    await expect(screen.queryByText(PUBLIC_DRAFT_HINT)).not.toBeInTheDocument();
  },
};

export const SavesSelectedVisibility: Story = {
  play: async ({ args }) => {
    const save = await screen.findByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: /Public/ }));
    await userEvent.click(save);

    await expect(args.onSave).toHaveBeenCalledWith("public");
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
  },
};

export const PrivateLockedForNonCreator: Story = {
  args: { canSetPrivate: false },
  play: async () => {
    await expect(await screen.findByRole("radio", { name: /Private/ })).toBeDisabled();
    await expect(screen.getByText("Only the creator can set this")).toBeInTheDocument();
  },
};
