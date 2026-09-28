import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, screen, userEvent, within } from "storybook/test";

import { GuideVisibilityBadge } from "./guide-visibility-badge";
import { PUBLIC_DRAFT_HINT } from "@/models";

const meta = {
  title: "Guides/GuideVisibilityBadge",
  component: GuideVisibilityBadge,
  args: {
    visibility: "public",
    status: "draft",
  },
} satisfies Meta<typeof GuideVisibilityBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PublicDraftExplainsItIsNotVisibleYet: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByText("Public"));
    await expect(await screen.findByRole("tooltip")).toHaveTextContent(PUBLIC_DRAFT_HINT);
  },
};

export const PublicPublishedHasNoHint: Story = {
  args: { status: "published" },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByText("Public"));
    await expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  },
};

export const Team: Story = {
  args: { visibility: "team" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Team")).toBeVisible();
  },
};

export const Private: Story = {
  args: { visibility: "private" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Private")).toBeVisible();
  },
};
