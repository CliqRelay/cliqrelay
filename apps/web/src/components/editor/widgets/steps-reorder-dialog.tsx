import { useRef } from "react";
import { createPortal } from "react-dom";

import { closestCorners, DndContext, DragOverlay, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import type { Step } from "@repo/api-client";

import { GuideStepsLoadMore } from "../guides/guide-steps-load-more";
import { StepsReorderCard, StepsReorderCardPreview } from "./steps-reorder-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useStepReorder } from "@/hooks/useStepReorder";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: Step[];
  stepsLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onReorderSteps?: (
    targetStepId: string,
    prevStepId: string | null,
    nextStepId: string | null,
  ) => void;
  onRevealStep?: (stepId: string) => void;
};

export function StepsReorderDialog({
  open,
  onOpenChange,
  steps,
  stepsLoading,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  onReorderSteps,
  onRevealStep,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingStepId = useRef<string | null>(null);

  const { activeId, sensors, handleDragStart, handleDragEnd, handleDragCancel } = useStepReorder({
    steps,
    onReorder: onReorderSteps,
  });

  const activeStep = steps.find((step) => step.id === activeId);
  const stepNumbers = new Map(
    steps.filter((step) => step.type === "interaction").map((step, index) => [step.id, index + 1]),
  );

  const handleReveal = (stepId: string) => {
    pendingStepId.current = stepId;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (!pendingStepId.current) {
            return;
          }

          event.preventDefault();
          onRevealStep?.(pendingStepId.current);
          pendingStepId.current = null;
        }}
      >
        <DialogHeader>
          <DialogTitle>Reorder steps</DialogTitle>
          <DialogDescription>
            Drag steps into a new order, or select one to jump to it.
          </DialogDescription>
        </DialogHeader>

        {steps.length === 0 ? (
          stepsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5 text-muted-foreground" />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No steps to reorder yet.
            </p>
          )
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={steps.map((step) => step.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                ref={scrollRef}
                className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto pr-1"
              >
                {steps.map((step) => (
                  <StepsReorderCard
                    key={step.id}
                    step={step}
                    stepNumber={stepNumbers.get(step.id)}
                    onReveal={handleReveal}
                  />
                ))}

                {onLoadMore && (
                  <GuideStepsLoadMore
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={onLoadMore}
                    rootRef={scrollRef}
                    disabled={activeId !== null}
                  />
                )}
              </div>
            </SortableContext>

            {typeof document !== "undefined" &&
              createPortal(
                <DragOverlay>
                  {activeStep ? (
                    <StepsReorderCardPreview
                      step={activeStep}
                      stepNumber={stepNumbers.get(activeStep.id)}
                    />
                  ) : null}
                </DragOverlay>,
                document.body,
              )}
          </DndContext>
        )}
      </DialogContent>
    </Dialog>
  );
}
