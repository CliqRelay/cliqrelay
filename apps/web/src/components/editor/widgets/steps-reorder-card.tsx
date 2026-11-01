import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import { cn } from "@/lib/utils";
import { getStepTitle } from "@/models";

type Props = {
  step: Step;
  stepNumber?: number;
  onReveal: (stepId: string) => void;
};

function StepsReorderCardBody({ step, stepNumber }: Pick<Props, "step" | "stepNumber">) {
  return (
    <>
      {stepNumber !== undefined && (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {stepNumber}
        </span>
      )}
      <span className="truncate text-sm">{getStepTitle(step, stepNumber ?? 0)}</span>
    </>
  );
}

export function StepsReorderCard({ step, stepNumber, onReveal }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-stretch gap-1 rounded-md border bg-card",
        isDragging && "opacity-40",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={
          stepNumber === undefined
            ? `Reorder ${getStepTitle(step, 0)}`
            : `Reorder step ${stepNumber}`
        }
        className="flex cursor-grab touch-none items-center px-3 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-4" />
      </div>

      <button
        type="button"
        onClick={() => onReveal(step.id)}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-3 text-left"
      >
        <StepsReorderCardBody step={step} stepNumber={stepNumber} />
      </button>
    </div>
  );
}

export function StepsReorderCardPreview({ step, stepNumber }: Pick<Props, "step" | "stepNumber">) {
  return (
    <div data-dnd-overlay className="flex items-stretch gap-1 rounded-md border bg-card shadow-xl">
      <div className="flex items-center px-2 text-muted-foreground">
        <GripVerticalIcon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-3">
        <StepsReorderCardBody step={step} stepNumber={stepNumber} />
      </div>
    </div>
  );
}
