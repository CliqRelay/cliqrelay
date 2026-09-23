import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";

import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import type { ActivityLog } from "@repo/api-client";

import { ActivityFeedList } from "./activity-feed";

const withRouter: Decorator = (Story) => {
  const router = createRouter({
    routeTree: createRootRoute({ component: Story }),
    history: createMemoryHistory(),
  });
  return <RouterProvider router={router} />;
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const guide = (title: string) => ({ title, status: "draft", visibility: "team" }) as const;

const log = (overrides: Partial<ActivityLog>): ActivityLog => ({
  id: crypto.randomUUID(),
  organizationId: "org-1",
  teamId: "team-1",
  actorId: "user-1",
  actorType: "user",
  targetId: crypto.randomUUID(),
  targetType: "guide",
  eventType: "guide.created",
  metadata: { user: { name: "Ada Lovelace" }, guide: guide("Set up SSO") },
  createdAt: minutesAgo(2),
  ...overrides,
});

const meta = {
  title: "Dashboard/ActivityFeed",
  component: ActivityFeedList,
  decorators: [withRouter],
  args: { items: [], isLoading: false },
} satisfies Meta<typeof ActivityFeedList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  args: {
    items: [
      log({
        eventType: "guide.published",
        metadata: { user: { name: "Ada Lovelace" }, guide: guide("Set up SSO") },
      }),
      log({
        actorId: "user-2",
        eventType: "guide.updated",
        metadata: { user: { name: "Grace Hopper" }, guide: guide("Invite teammates") },
        createdAt: minutesAgo(60),
      }),
      log({
        actorId: "user-3",
        eventType: "guide.deleted",
        metadata: { user: { name: "Alan Turing" }, guide: guide("Old onboarding") },
        createdAt: minutesAgo(180),
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText("Ada Lovelace")).toBeInTheDocument();
    await expect(canvas.getByText("published")).toBeInTheDocument();
    await expect(canvas.getByText("2m ago")).toBeInTheDocument();
    await expect(canvas.getByText("1h ago")).toBeInTheDocument();

    const link = canvas.getByRole("link", { name: "Set up SSO" });
    await expect(link.getAttribute("href")).toMatch(/^\/dashboard\/guides\//);

    await expect(canvas.getByText("Old onboarding").tagName).not.toBe("A");
  },
};

export const Overflowing: Story = {
  args: {
    items: Array.from({ length: 10 }, (_, i) =>
      log({
        actorId: `user-${i}`,
        metadata: { user: { name: `Member ${i + 1}` }, guide: guide(`Guide ${i + 1}`) },
        createdAt: minutesAgo(i * 5),
      }),
    ),
  },
  play: async ({ canvasElement }) => {
    const list = await within(canvasElement).findByTestId("activity-list");
    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    await expect(list.clientHeight).toBeLessThanOrEqual(320);
  },
};

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No activity yet")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findAllByTestId("activity-skeleton")).toHaveLength(4);
    await expect(canvas.queryByText("No activity yet")).not.toBeInTheDocument();
  },
};
