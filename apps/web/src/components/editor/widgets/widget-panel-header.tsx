import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EditorWidgetManifest } from "@/models";

type Props = {
  title: string;
  widgets: readonly EditorWidgetManifest[];
  activeWidgetId: string | null;
  onSelectWidget: (widgetId: string, trigger?: HTMLElement | null) => void;
  onClose: () => void;
  showSwitcher?: boolean;
};

export function WidgetPanelHeader({
  title,
  widgets,
  activeWidgetId,
  onSelectWidget,
  onClose,
  showSwitcher = false,
}: Props) {
  return (
    <header className="flex items-center gap-2 border-b px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {showSwitcher && widgets.length > 1 ? (
          widgets.map((widget) => (
            <Button
              key={widget.id}
              type="button"
              variant={activeWidgetId === widget.id ? "secondary" : "ghost"}
              size="xs"
              aria-pressed={activeWidgetId === widget.id}
              onClick={(event) => onSelectWidget(widget.id, event.currentTarget)}
            >
              {widget.label}
            </Button>
          ))
        ) : (
          <h2 className="truncate text-sm font-medium">{title}</h2>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close widget panel"
        onClick={onClose}
      >
        <XIcon className="h-4 w-4" />
      </Button>
    </header>
  );
}
