import type { Meta, StoryObj } from "@storybook/react-vite";

import { ShieldIcon, ListOrderedIcon } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";

import type { Guide } from "@repo/api-client";
import { extensionRegistry } from "@repo/extensions-sdk";

import { GuideEditorWidgetPanel } from "./guide-editor-widget-panel";
import { WIDGET_PANEL_ID } from "./widget-rail";
import { WidgetRailButton } from "./widget-rail-button";
import { ExtensionSlotKeys } from "@/constants/extension-slots";
import type { EditorWidgetManifest, EditorWidgetProps } from "@/models";
import { useEditorStore } from "@/stores";
import { makeInteractionStep } from "@/test/fixtures/steps";

const guide: Guide = {
  id: "guide-1",
  title: "Test guide",
  status: "draft",
  visibility: "private",
  creatorId: null,
  durationSeconds: 0,
  isStarred: false,
  teamId: "team-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const steps = [
  makeInteractionStep({ id: "step-1", sortOrder: "a0", actionText: "First step" }),
  makeInteractionStep({ id: "step-2", sortOrder: "a1", actionText: "Second step" }),
  makeInteractionStep({ id: "step-3", sortOrder: "a2", actionText: "Third step" }),
];

function TestWidget({ steps }: EditorWidgetProps) {
  return <p>{steps.length} steps</p>;
}

const stepsWidget: EditorWidgetManifest = {
  id: "steps-reorder",
  label: "Reorder steps",
  icon: ListOrderedIcon,
  component: TestWidget,
};

const emptyStateWidget: EditorWidgetManifest = {
  ...stepsWidget,
  id: "empty-state",
  label: "Empty state",
  component: () => <p>Nothing to show</p>,
};

const eeWidgetId = "ee-redaction";

function EeRailButton(props: Record<string, unknown>) {
  const { activeWidgetId, toggleWidget } = props as {
    activeWidgetId: string | null;
    toggleWidget: (widgetId: string) => void;
  };

  return (
    <WidgetRailButton
      label="Redaction"
      icon={ShieldIcon}
      isActive={activeWidgetId === eeWidgetId}
      controlsId={WIDGET_PANEL_ID}
      onClick={() => toggleWidget(eeWidgetId)}
    />
  );
}

function EePanelBody() {
  return <p>Redaction controls</p>;
}

const meta = {
  title: "Editor/Widgets/GuideEditorWidgetPanel",
  component: GuideEditorWidgetPanel,
  args: {
    guide,
    steps,
    stepsLoading: false,
    selectedStepId: null,
    onSelectStep: fn(),
  },
  beforeEach: () => {
    useEditorStore.getState().reset();
    extensionRegistry.clear();

    return () => {
      useEditorStore.getState().reset();
      extensionRegistry.clear();
    };
  },
} satisfies Meta<typeof GuideEditorWidgetPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RailToggleOpensWidget: Story = {
  args: { widgets: [stepsWidget] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Reorder steps" }));

    await expect(await canvas.findByRole("region", { name: "Reorder steps" })).toBeInTheDocument();
    await expect(canvas.getByText("3 steps")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Reorder steps" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  },
};

export const RailButtonShowsTooltip: Story = {
  args: { widgets: [stepsWidget] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.hover(canvas.getByRole("button", { name: "Reorder steps" }));

    await expect(await screen.findByRole("tooltip")).toHaveTextContent("Reorder steps");
  },
};

export const ExtensionSlotsRenderRailAndPanel: Story = {
  decorators: [
    (Story) => {
      extensionRegistry.install({
        id: "ee-test",
        slots: [
          { name: ExtensionSlotKeys.GUIDE_EDITOR_WIDGET_RAIL, component: EeRailButton },
          { name: ExtensionSlotKeys.GUIDE_EDITOR_WIDGET_PANEL, component: EePanelBody },
        ],
        navItems: [],
      });
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Redaction" }));

    await expect(canvas.getByText("Redaction controls")).toBeInTheDocument();
  },
};

export const ClickAwayClosesWithoutClearingSelection: Story = {
  args: { widgets: [stepsWidget], selectedStepId: "step-1" },
  render: (args) => (
    <>
      <button type="button">Outside</button>
      <GuideEditorWidgetPanel {...args} />
    </>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Reorder steps" }));
    await expect(await canvas.findByRole("region", { name: "Reorder steps" })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Outside" }));

    await waitFor(() =>
      expect(canvas.queryByRole("region", { name: "Reorder steps" })).not.toBeInTheDocument(),
    );
    await expect(args.onSelectStep).not.toHaveBeenCalled();
  },
};

export const EscapeClosesAndRestoresFocus: Story = {
  args: { widgets: [stepsWidget] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const railButton = canvas.getByRole("button", { name: "Reorder steps" });

    await userEvent.click(railButton);
    await expect(await canvas.findByRole("region", { name: "Reorder steps" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(canvas.queryByRole("region", { name: "Reorder steps" })).not.toBeInTheDocument(),
    );
    await expect(railButton).toHaveFocus();
  },
};

export const SwitchingWidgetsKeepsPanelOpen: Story = {
  args: { widgets: [stepsWidget, emptyStateWidget] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Reorder steps" }));
    await expect(canvas.getByText("3 steps")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Empty state" }));
    await expect(canvas.getByText("Nothing to show")).toBeInTheDocument();
  },
};

export const EmptyShellRendersNothing: Story = {
  args: { widgets: [] },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector("[data-editor-widget-surface]"),
    ).not.toBeInTheDocument();
    await expect(within(canvasElement).queryByRole("button")).not.toBeInTheDocument();
  },
};
