import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, screen, userEvent } from "storybook/test";

import { ExportFormatSelector } from "./export-dialog";

const meta = {
  title: "Editor/ExportDialog/FormatSelector",
  component: ExportFormatSelector,
  args: {
    selectedFormat: "pdf",
    onSelect: fn(),
  },
} satisfies Meta<typeof ExportFormatSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PdfSelected: Story = {
  play: async () => {
    await expect(await screen.findByText("PDF")).toBeInTheDocument();
    await expect(screen.getByText("ZIP backup")).toBeInTheDocument();
  },
};

export const ZipSelected: Story = {
  args: { selectedFormat: "zip" },
  play: async ({ args }) => {
    await userEvent.click(await screen.findByRole("button", { name: /PDF/ }));
    await expect(args.onSelect).toHaveBeenCalledWith("pdf");
  },
};

export const ZipDisabledWhileUploading: Story = {
  args: { zipDisabled: true },
  play: async () => {
    const zip = await screen.findByRole("button", { name: /ZIP backup/ });
    await expect(zip).toBeDisabled();
    await expect(screen.getByText("Uploads in progress")).toBeInTheDocument();
  },
};
