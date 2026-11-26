import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GuideExportController } from "@/models";

type Props = {
  controller: GuideExportController;
};

export function ExportStatus({ controller }: Props) {
  if (controller.status === "idle") {
    return null;
  }

  if (controller.status === "running") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {controller.progress?.label ?? controller.runningLabel}
        </p>
      </div>
    );
  }

  if (controller.status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">{controller.doneLabel}</p>
      </div>
    );
  }

  if (!controller.error) {
    return null;
  }

  return (
    <div className="space-y-3 py-4">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm font-medium text-destructive">{controller.error.title}</p>
        {controller.error.messages.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {controller.error.messages.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        )}
      </div>
      {controller.error.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {controller.error.actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant ?? "default"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
