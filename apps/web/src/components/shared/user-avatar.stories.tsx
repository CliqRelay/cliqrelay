import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { UserAvatar } from "./user-avatar";

const user = { id: "b9da4246-4cc5-4785-a4bf-fca7b33a7444" };

const meta = {
  title: "Shared/UserAvatar",
  component: UserAvatar,
  args: { user },
} satisfies Meta<typeof UserAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const generatedAvatars = (root: HTMLElement) => within(root).getAllByRole("img");

export const Generated: Story = {
  play: async ({ canvasElement }) => {
    await expect(generatedAvatars(canvasElement)).toHaveLength(1);
  },
};

export const Deterministic: Story = {
  render: () => (
    <div className="flex gap-2">
      <UserAvatar user={user} />
      <UserAvatar user={user} />
      <UserAvatar user={{ id: "89b582cf-b08f-45a1-b475-4706037a92f4" }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [first, repeated, other] = generatedAvatars(canvasElement).map(
      (avatar) => avatar.parentElement?.outerHTML,
    );

    await expect(first).toBe(repeated);
    await expect(first).not.toBe(other);
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <UserAvatar user={user} avatar={{ size: 16 }} />
      <UserAvatar user={user} avatar={{ size: 24 }} />
      <UserAvatar user={user} avatar={{ size: 32 }} />
      <UserAvatar user={user} avatar={{ size: 40 }} />
    </div>
  ),
};

export const Customization: Story = {
  args: {
    user,
    avatar: {
      size: 48,
      border: true,
      borderSize: 2,
      borderColor: "#ffffff",
      shadow: true,
      radius: 12,
    },
  },
};
