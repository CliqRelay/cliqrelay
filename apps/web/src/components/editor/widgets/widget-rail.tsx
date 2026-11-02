import { ExtensionSlot } from "@repo/extensions-sdk";

import { WidgetRailButton } from "./widget-rail-button";
import { ExtensionSlotKeys } from "@/constants/extension-slots";
import type { EditorWidgetManifest, EditorWidgetProps } from "@/models";

export const WIDGET_PANEL_ID = "guide-editor-widget-panel";

type Props = {
  widgets: readonly EditorWidgetManifest[];
  activeWidgetId: string | null;
  onToggleWidget: (widgetId: string, trigger?: HTMLElement | null) => void;
  onCloseWidget: () => void;
  widgetProps: EditorWidgetProps;
};

export function WidgetRail({
  widgets,
  activeWidgetId,
  onToggleWidget,
  onCloseWidget,
  widgetProps,
}: Props) {
  return (
    <div
      data-editor-widget-surface
      className="pointer-events-none flex max-h-[calc(100dvh-7rem)] w-11 flex-col gap-0.5 rounded border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
    >
      {widgets.map((widget) => {
        const WidgetButton = widget.button;
        const isActive = activeWidgetId === widget.id;

        if (WidgetButton) {
          return (
            <WidgetButton
              key={widget.id}
              label={widget.label}
              icon={widget.icon}
              isActive={isActive}
              widgetProps={widgetProps}
              onActiveChange={(active, trigger) => {
                if (active) {
                  onToggleWidget(widget.id, trigger);
                  return;
                }

                onCloseWidget();
              }}
            />
          );
        }

        return (
          <WidgetRailButton
            key={widget.id}
            label={widget.label}
            icon={widget.icon}
            isActive={isActive}
            controlsId={WIDGET_PANEL_ID}
            onClick={(event) => onToggleWidget(widget.id, event.currentTarget)}
          />
        );
      })}

      <ExtensionSlot
        name={ExtensionSlotKeys.GUIDE_EDITOR_WIDGET_RAIL}
        props={{ activeWidgetId, toggleWidget: onToggleWidget, widgetProps }}
      />
    </div>
  );
}
