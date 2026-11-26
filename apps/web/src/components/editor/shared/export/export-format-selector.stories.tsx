import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileText } from "lucide-react";
import { expect, fn, screen, userEvent } from "storybook/test";

import { ExportFormatSelector, type ExportFormatOption } from "./export-format-selector";
import { archiveExportStrategy, pdfExportStrategy } from "./strategies";
import type { GuideExportController, GuideExportManifest } from "@/models";

const createController = (): GuideExportController => ({
  status: "idle",
  progress: null,
  error: null,
  config: null,
  startLabel: "Download",
  runningLabel: "Preparing...",
  doneLabel: "Export ready.",
  startDisabled: false,
  start: fn(),
  cancel: null,
});

const customStrategy: GuideExportManifest = {
  id: "custom",
  label: "Custom",
  description: "Custom export strategy for testing.",
  icon: FileText,
  group: "integration",
  getAvailability: () => ({ available: true }),
  useController: createController,
};

const baseOptions: ExportFormatOption[] = [
  { strategy: pdfExportStrategy, availability: { available: true } },
  { strategy: archiveExportStrategy, availability: { available: true } },
];

const meta = {
  title: "Editor/ExportDialog/FormatSelector",
  component: ExportFormatSelector,
  args: {
    options: baseOptions,
    selectedId: "pdf",
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
  args: { selectedId: "zip" },
  play: async ({ args }) => {
    await userEvent.click(await screen.findByRole("button", { name: /PDF/ }));
    await expect(args.onSelect).toHaveBeenCalledWith("pdf");
  },
};

export const ZipDisabledWhileUploading: Story = {
  args: {
    options: [
      baseOptions[0],
      {
        strategy: archiveExportStrategy,
        availability: { available: false, reason: "Uploads in progress" },
      },
    ],
  },
  play: async () => {
    const zip = await screen.findByRole("button", { name: /ZIP backup/ });
    await expect(zip).toBeDisabled();
    await expect(screen.getByText("Uploads in progress")).toBeInTheDocument();
  },
};

export const IntegrationGroup: Story = {
  args: {
    options: [...baseOptions, { strategy: customStrategy, availability: { available: true } }],
  },
  play: async () => {
    await expect(await screen.findByText("Integrations")).toBeVisible();
    await expect(screen.getByRole("button", { name: /Custom/ })).toBeVisible();
  },
};
