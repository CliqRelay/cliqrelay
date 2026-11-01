import { useEffect, useRef } from "react";

import { closestCorners, DndContext, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import { StepDragOverlay } from "../steps/step-drag-overlay";
import { StepEditCard } from "../steps/step-edit-card";
import { StepTypeDock } from "../steps/step-type-dock";
import { GuideStepsLoadMore } from "./guide-steps-load-more";
import { Button } from "@/components/ui/button";
import { EDITOR_POINTER_IGNORE_SELECTOR } from "@/constants/editor";
import { useStepReorder } from "@/hooks/useStepReorder";
import type { StepTypeOption } from "@/models";

type Props = {
  steps: Step[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string | null) => void;
  onUpdateStep?: (stepId: string, updates: Record<string, unknown>) => void;
  onAddStepWithType?: (type: StepTypeOption) => void;
  onAddStepBeforeWithType?: (stepId: string, type: StepTypeOption) => void;
  onDeleteStep?: (stepId: string) => void;
  onDuplicateStep?: (stepId: string) => void;
  onReplaceStepMedia?: (stepId: string, file: File) => void;
  replacingStepIds?: string[];
  onReorderSteps?: (
    targetStepId: string,
    prevStepId: string | null,
    nextStepId: string | null,
  ) => void;
};

// Radix portals (Select, DropdownMenu, Tooltip, ...) render outside the timeline but belong to it
export function GuideWorkflowTimeline({
  steps,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  selectedStepId,
  onSelectStep,
  onUpdateStep,
  onAddStepWithType,
  onAddStepBeforeWithType,
  onDeleteStep,
  onDuplicateStep,
  onReplaceStepMedia,
  replacingStepIds = [],
  onReorderSteps,
}: Props) {
  const sortedSteps = [...steps];
  const stepsMap = new Map(
    steps.filter((step) => step.type === "interaction").map((step, index) => [step.id, index + 1]),
  );

  const timelineRef = useRef<HTMLDivElement>(null);

  const { activeId, sensors, handleDragStart, handleDragEnd, handleDragCancel } = useStepReorder({
    steps: sortedSteps,
    onReorder: onReorderSteps,
  });

  useEffect(() => {
    if (!selectedStepId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        timelineRef.current &&
        !timelineRef.current.contains(target) &&
        !target.closest(EDITOR_POINTER_IGNORE_SELECTOR)
      ) {
        onSelectStep?.(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedStepId, onSelectStep]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="relative mt-10 flex flex-col gap-6" ref={timelineRef}>
          {sortedSteps.map((step, index) => (
            <StepEditCard
              key={step.id}
              step={step}
              stepNumber={stepsMap.get(step.id) ?? index + 1}
              selectedStepId={selectedStepId}
              isReplacing={replacingStepIds.includes(step.id)}
              actions={{
                onSelect: onSelectStep,
                onUpdate: onUpdateStep,
                onDelete: onDeleteStep,
                onDuplicate: onDuplicateStep,
                onReplaceMedia: onReplaceStepMedia,
                onAddStepBeforeWithType: onAddStepBeforeWithType,
              }}
            />
          ))}

          {onLoadMore && (
            <GuideStepsLoadMore
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={onLoadMore}
            />
          )}

          {onAddStepWithType && !hasNextPage && (
            <StepTypeDock onSelect={(type) => onAddStepWithType(type)}>
              <div className="flex w-full flex-row pl-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed bg-background text-muted-foreground hover:text-foreground"
                >
                  <PlusIcon className="mr-1 h-4 w-4" />
                  Add Step
                </Button>
              </div>
            </StepTypeDock>
          )}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId
          ? (() => {
              const activeStep = sortedSteps.find((s) => s.id === activeId);
              const activeIndex = sortedSteps.findIndex((s) => s.id === activeId);
              if (!activeStep) return null;
              return <StepDragOverlay step={activeStep} index={activeIndex} />;
            })()
          : null}
      </DragOverlay>
    </DndContext>
  );
}
