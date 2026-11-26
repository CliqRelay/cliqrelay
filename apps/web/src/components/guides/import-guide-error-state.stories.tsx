import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen } from "storybook/test";

import { ImportGuideErrorState } from "./import-guide-dialog";

const meta = {
  title: "Guides/ImportGuideDialog/ErrorState",
  component: ImportGuideErrorState,
  args: {
    message: "This backup is too large. The maximum is 250 MB.",
    onSelectAnother: fn(),
  },
} satisfies Meta<typeof ImportGuideErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Oversized: Story = {
  play: async () => {
    await expect(
      await screen.findByText("This backup is too large. The maximum is 250 MB."),
    ).toBeVisible();
    await expect(screen.getByRole("button", { name: "Select another backup" })).toBeVisible();
  },
};

export const InvalidArchive: Story = {
  args: { message: "This .zip does not contain manifest.json." },
};
