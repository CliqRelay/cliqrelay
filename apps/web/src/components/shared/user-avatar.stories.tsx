import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { UserAvatar } from "./user-avatar";

const alice = { id: "user_alice", name: "Alice Example", image: null };

const meta = {
  title: "Shared/UserAvatar",
  component: UserAvatar,
  args: { user: alice },
} satisfies Meta<typeof UserAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const generatedImages = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLImageElement>('img[src^="data:image/svg+xml"]'));

export const Generated: Story = {
  play: async ({ canvasElement }) => {
    await expect(generatedImages(canvasElement)).toHaveLength(1);
  },
};

export const WithPhoto: Story = {
  args: {
    user: {
      ...alice,
      image: "https://api.dicebear.com/9.x/shapes/svg?seed=alice",
    },
  },
  play: async ({ canvasElement }) => {
    const photo = await within(canvasElement).findByAltText("Alice Example");
    await expect(photo).toHaveAttribute(
      "src",
      "https://api.dicebear.com/9.x/shapes/svg?seed=alice",
    );
  },
};

export const Deterministic: Story = {
  render: () => (
    <div className="flex gap-2">
      <UserAvatar user={alice} />
      <UserAvatar user={{ ...alice, name: "Alice Renamed" }} />
      <UserAvatar user={{ id: "user_bob", name: "Bob Example" }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [first, renamed, other] = generatedImages(canvasElement).map((img) => img.src);
    await expect(first).toBe(renamed);
    await expect(first).not.toBe(other);
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <UserAvatar user={alice} className="size-4" />
      <UserAvatar user={alice} size="sm" />
      <UserAvatar user={alice} size="default" />
      <UserAvatar user={alice} size="lg" />
    </div>
  ),
};
