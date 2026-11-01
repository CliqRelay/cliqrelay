import { GripVerticalIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import { Card, CardContent } from "@/components/ui/card";
import { getStepTitle } from "@/models";

type Props = {
  step: Step;
  index: number;
};

export function StepDragOverlay({ step, index }: Props) {
  const title = getStepTitle(step, index + 1);

  return (
    <Card className="shadow-xl">
      <CardContent>
        {step.type === "canvas" ? (
          <div className="flex items-center gap-3">
            <GripVerticalIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h3 className="truncate text-xl font-semibold tracking-tight">{title}</h3>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
              {index + 1}
            </div>
            <h3 className="truncate text-xl font-semibold tracking-tight">{title}</h3>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
