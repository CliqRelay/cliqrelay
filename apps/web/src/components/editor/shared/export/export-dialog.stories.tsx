import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileText, Package } from "lucide-react";
import { expect, fn, screen } from "storybook/test";

import { ExportDialog } from "./export-dialog";
import type { GuideExportAvailability, GuideExportController, GuideExportManifest } from "@/models";

const createController = (label: string): GuideExportController => ({
  status: "idle",
  progress: null,
  error: null,
  config: null,
  startLabel: `Download ${label}`,
  runningLabel: `Generating ${label}...`,
  doneLabel: `${label} export ready.`,
  startDisabled: false,
  start: fn(),
  cancel: null,
});

const createStrategy = ({
  id,
  label,
  description,
  icon,
  availability = { available: true },
}: {
  id: string;
  label: string;
  description: string;
  icon: GuideExportManifest["icon"];
  availability?: GuideExportAvailability;
}): GuideExportManifest => ({
  id,
  label,
  description,
  icon,
  group: "download",
  getAvailability: () => availability,
  useController: () => createController(label),
});

const strategies: GuideExportManifest[] = [
  createStrategy({
    id: "pdf",
    label: "PDF",
    description: "A printable document of the guide.",
    icon: FileText,
  }),
  createStrategy({
    id: "zip",
    label: "ZIP backup",
    description: "Manifest and screenshots you can re-import later.",
    icon: Package,
  }),
];

const meta = {
  title: "Editor/ExportDialog/Dialog",
  component: ExportDialog,
  args: {
    guide: {
      id: "guide-1",
      title: "Checkout flow",
      description: "How to complete a checkout.",
      metadata: null,
    },
    open: true,
    onOpenChange: fn(),
    strategies,
  },
} satisfies Meta<typeof ExportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async () => {
    await expect(await screen.findByText("Export Guide")).toBeInTheDocument();
    await expect(screen.getByRole("button", { name: /^PDF/ })).toBeInTheDocument();
    await expect(screen.getByRole("button", { name: /^ZIP backup/ })).toBeInTheDocument();
  },
};

export const ZipUnavailableWhileUploading: Story = {
  args: {
    replacingStepIds: ["step-1"],
    strategies: [
      strategies[0],
      createStrategy({
        id: "zip",
        label: "ZIP backup",
        description: "Manifest and screenshots you can re-import later.",
        icon: Package,
        availability: { available: false, reason: "Uploads in progress" },
      }),
    ],
  },
  play: async () => {
    await expect(await screen.findByText("Uploads in progress")).toBeInTheDocument();
    await expect(screen.getByRole("button", { name: /^ZIP backup/ })).toBeDisabled();
  },
};
