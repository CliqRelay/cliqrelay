import { useEffect, useRef } from "react";

import { EDITOR_POINTER_IGNORE_SELECTOR } from "@/constants/editor";
import { useEditorStore } from "@/stores";

export function useEditorWidgetPanel() {
  const activeWidgetId = useEditorStore((state) => state.activeWidgetId);
  const toggleWidgetInStore = useEditorStore((state) => state.toggleWidget);
  const closeWidget = useEditorStore((state) => state.closeWidget);

  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousWidgetId = useRef<string | null>(activeWidgetId);

  const isOpen = activeWidgetId !== null;

  const toggleWidget = (widgetId: string, trigger?: HTMLElement | null) => {
    if (activeWidgetId !== widgetId) {
      triggerRef.current =
        trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    }
    toggleWidgetInStore(widgetId);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(EDITOR_POINTER_IGNORE_SELECTOR)) return;
      closeWidget();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      closeWidget();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeWidget]);

  useEffect(() => {
    const wasOpen = previousWidgetId.current !== null;
    previousWidgetId.current = activeWidgetId;

    if (activeWidgetId && !wasOpen) {
      panelRef.current?.focus();
      return;
    }

    if (!activeWidgetId && wasOpen) {
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [activeWidgetId]);

  return { activeWidgetId, panelRef, toggleWidget, closeWidget };
}
