import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen } from "storybook/test";

import { ImportGuideDropzone } from "./import-guide-dialog";

const meta = {
  title: "Guides/ImportGuideDialog/Dropzone",
  component: ImportGuideDropzone,
  args: {
    onSelect: fn(),
    onMultipleFiles: fn(),
    error: null,
  },
} satisfies Meta<typeof ImportGuideDropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectionError: Story = {
  args: { error: "Select one .zip file at a time." },
  play: async () => {
    await expect(await screen.findByText("Select one .zip file at a time.")).toBeVisible();
  },
};

export const DropsMultipleFiles: Story = {
  play: async ({ args }) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(["a"], "one.zip", { type: "application/zip" }));
    dataTransfer.items.add(new File(["b"], "two.zip", { type: "application/zip" }));

    screen
      .getByRole("button", { name: /Drop a guide backup here/ })
      .dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));

    await expect(args.onMultipleFiles).toHaveBeenCalled();
    await expect(args.onSelect).not.toHaveBeenCalled();
  },
};

export const DropsOneFile: Story = {
  play: async ({ args }) => {
    const dataTransfer = new DataTransfer();
    const file = new File(["a"], "one.zip", { type: "application/zip" });
    dataTransfer.items.add(file);

    screen
      .getByRole("button", { name: /Drop a guide backup here/ })
      .dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));

    await expect(args.onSelect).toHaveBeenCalledWith(file);
  },
};
