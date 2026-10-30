import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { Step } from "@repo/api-client";
import { ExtensionSlot, extensionRegistry } from "@repo/extensions-sdk";

import { useEditorWidgetPanel } from "./use-editor-widget-panel";
import { WidgetPanelHeader } from "./widget-panel-header";
import { WidgetRail, WIDGET_PANEL_ID } from "./widget-rail";
import { ExtensionSlotKeys } from "@/constants/extension-slots";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { CORE_WIDGET_MANIFESTS, type EditorWidgetManifest, type EditorWidgetProps } from "@/models";

type Props = {
  guide: EditorWidgetProps["guide"];
  steps: Step[];
  stepsLoading?: boolean;
  selectedStepId: string | null;
  onSelectStep: (stepId: string | null) => void;
  widgets?: readonly EditorWidgetManifest[];
};

export function GuideEditorWidgetPanel({
  guide,
  steps,
  stepsLoading = false,
  selectedStepId,
  onSelectStep,
  widgets = CORE_WIDGET_MANIFESTS,
}: Props) {
  const { activeWidgetId, panelRef, toggleWidget, closeWidget } = useEditorWidgetPanel();
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  const widgetProps: EditorWidgetProps = {
    guide,
    steps,
    stepsLoading,
    selectedStepId,
    onSelectStep,
  };

  const activeManifest = widgets.find((widget) => widget.id === activeWidgetId);
  const ActiveWidget = activeManifest?.component;
  const title = activeManifest?.label ?? "Widget";

  const hasRailExtension =
    extensionRegistry.getSlot(ExtensionSlotKeys.GUIDE_EDITOR_WIDGET_RAIL) != null;

  if (widgets.length === 0 && !hasRailExtension) {
    return null;
  }

  const offset = prefersReducedMotion
    ? { opacity: 0 }
    : isMobile
      ? { opacity: 0, y: 24 }
      : { opacity: 0, x: 24 };

  const rail = (
    <WidgetRail
      widgets={widgets}
      activeWidgetId={activeWidgetId}
      onToggleWidget={toggleWidget}
      widgetProps={widgetProps}
    />
  );

  const panel = (
    <AnimatePresence>
      {activeWidgetId && (
        <motion.section
          id={WIDGET_PANEL_ID}
          ref={panelRef}
          tabIndex={-1}
          aria-label={title}
          className={cn(
            "pointer-events-auto flex flex-col overflow-hidden border bg-background shadow-xl outline-none",
            isMobile
              ? "max-h-[75dvh] w-full rounded-t-md border-b-0"
              : "max-h-[calc(100dvh-10rem)] w-80 rounded-md",
          )}
          initial={offset}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={offset}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <WidgetPanelHeader
            title={title}
            widgets={widgets}
            activeWidgetId={activeWidgetId}
            onSelectWidget={toggleWidget}
            onClose={closeWidget}
            showSwitcher={isMobile}
          />

          <div className="flex-1 overflow-y-auto p-3">
            {ActiveWidget ? (
              <ActiveWidget {...widgetProps} />
            ) : (
              <ExtensionSlot
                name={ExtensionSlotKeys.GUIDE_EDITOR_WIDGET_PANEL}
                props={{ activeWidgetId, widgetProps }}
              />
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );

  if (isMobile) {
    return (
      <>
        <div
          data-editor-widget-surface
          className="pointer-events-none fixed top-24 right-2 z-30 flex flex-col md:right-3"
        >
          {rail}
        </div>

        <AnimatePresence>
          {activeWidgetId && (
            <motion.div
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeWidget}
            />
          )}
        </AnimatePresence>

        <div
          data-editor-widget-surface
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex"
        >
          {panel}
        </div>
      </>
    );
  }

  return (
    <div
      data-editor-widget-surface
      className="pointer-events-none fixed top-24 right-2 z-40 flex flex-col items-end gap-2 md:right-3"
    >
      {rail}
      {panel}
    </div>
  );
}
