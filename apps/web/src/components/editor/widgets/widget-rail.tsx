import { ExtensionSlot } from "@repo/extensions-sdk";

import { WidgetRailButton } from "./widget-rail-button";
import { ExtensionSlotKeys } from "@/constants/extension-slots";
import type { EditorWidgetManifest, EditorWidgetProps } from "@/models";

export const WIDGET_PANEL_ID = "guide-editor-widget-panel";

type Props = {
  widgets: readonly EditorWidgetManifest[];
  activeWidgetId: string | null;
  onToggleWidget: (widgetId: string, trigger?: HTMLElement | null) => void;
  widgetProps: EditorWidgetProps;
};

export function WidgetRail({ widgets, activeWidgetId, onToggleWidget, widgetProps }: Props) {
  return (
    <div
      data-editor-widget-surface
      className="pointer-events-none flex max-h-[calc(100dvh-7rem)] w-11 flex-col gap-0.5 rounded border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
    >
      {widgets.map((widget) => (
        <WidgetRailButton
          key={widget.id}
          label={widget.label}
          icon={widget.icon}
          isActive={activeWidgetId === widget.id}
          controlsId={WIDGET_PANEL_ID}
          onClick={(event) => onToggleWidget(widget.id, event.currentTarget)}
        />
      ))}

      <ExtensionSlot
        name={ExtensionSlotKeys.GUIDE_EDITOR_WIDGET_RAIL}
        props={{ activeWidgetId, toggleWidget: onToggleWidget, widgetProps }}
      />
    </div>
  );
}
