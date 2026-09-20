import { type ReactNode, useRef } from "react";

import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import { CanvasStepForm } from "./canvas-step-form";
import { CanvasStepPreview } from "./canvas-step-preview";
import { CanvasStepShell } from "./canvas-step-shell";
import { StepActionsMenu } from "./step-actions-menu";
import { StepItemForm } from "./step-item-form";
import { StepListItem } from "./step-list-item";
import { StepMediaPicker } from "./step-media-picker";
import { StepMediaToolbar } from "./step-media-toolbar";
import { StepTypeDock } from "./step-type-dock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StepTypeOption } from "@/models";
import { stepSupportsMedia } from "@/utils/steps.utils";

type EditableStepItemActions = {
  onSelect?: (stepId: string | null) => void;
  onUpdate?: (stepId: string, updates: Record<string, unknown>) => void;
  onDelete?: (stepId: string) => void;
  onDuplicate?: (stepId: string) => void;
  onReplaceMedia?: (stepId: string, file: File) => void;
  onAddStepBeforeWithType?: (stepId: string, type: StepTypeOption) => void;
};

type Props = {
  step: Step;
  stepNumber: number;
  selectedStepId?: string | null;
  actions?: EditableStepItemActions;
  isReplacing?: boolean;
};

export function StepEditCard({ step, stepNumber, selectedStepId, actions, isReplacing }: Props) {
  const { onSelect, onUpdate, onDelete, onDuplicate, onReplaceMedia, onAddStepBeforeWithType } =
    actions ?? {};
  const filePickerRef = useRef<HTMLInputElement>(null);
  const canReplaceMedia = onReplaceMedia != null && stepSupportsMedia(step);
  const handleOpenFilePicker = () => {
    filePickerRef.current?.click();
  };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const dndContext = useDndContext();
  const hasActiveDrag = dndContext?.active != null;

  const style = {
    transform: hasActiveDrag ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  const isSelected = selectedStepId === step.id;
  const isCanvasStep = step.type === "canvas";
  const isAlertLikeCanvasStep = isCanvasStep && step.canvasContent?.type !== "header";
  const toggleSelect = () => onSelect?.(isSelected ? null : step.id);

  const actionsMenu = (trigger: ReactNode) => (
    <StepActionsMenu
      step={step}
      trigger={trigger}
      isReplacing={isReplacing}
      onReplaceMedia={canReplaceMedia ? handleOpenFilePicker : undefined}
      onDuplicate={onDuplicate ? () => onDuplicate(step.id) : undefined}
      onDelete={onDelete ? () => onDelete(step.id) : undefined}
    />
  );

  const filePicker = canReplaceMedia && (
    <StepMediaPicker ref={filePickerRef} onSelect={(file) => onReplaceMedia(step.id, file)} />
  );

  const canvasToolbar = (
    <StepMediaToolbar visible={isSelected || isReplacing}>
      {actionsMenu(
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          aria-label="Step actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontalIcon />
        </Button>,
      )}
    </StepMediaToolbar>
  );

  const canvasStep = isSelected ? (
    <CanvasStepShell
      type={step.canvasContent?.type ?? "tip"}
      toolbar={canvasToolbar}
      className={cn("flex-1 cursor-pointer", isDragging && "opacity-20", "ring-2 ring-primary/30")}
      onClick={toggleSelect}
    >
      <div className="pr-20" onClick={(e) => e.stopPropagation()}>
        <CanvasStepForm
          step={step}
          onUpdate={onUpdate}
          onReplaceMedia={canReplaceMedia ? handleOpenFilePicker : undefined}
          isReplacing={isReplacing}
        />
      </div>
    </CanvasStepShell>
  ) : (
    <CanvasStepPreview
      step={step}
      toolbar={canvasToolbar}
      onReplaceMedia={canReplaceMedia ? handleOpenFilePicker : undefined}
      isReplacing={isReplacing}
      className={cn("flex-1 cursor-pointer", isDragging && "opacity-20")}
      onClick={toggleSelect}
    />
  );

  const cardStep = (
    <Card
      className={cn(
        "relative flex-1 cursor-pointer",
        !step.mediaAssets?.length && "gap-0",
        isDragging && "opacity-20",
        isSelected && "border-primary ring-2 ring-primary/30",
      )}
      onClick={toggleSelect}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-start gap-4",
          !!step.mediaAssets?.length && "border-b",
        )}
      >
        {!isCanvasStep && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-muted-foreground bg-muted text-base font-bold text-foreground">
              {stepNumber}
            </div>
            {!isSelected && (
              <h3 className="text-base font-semibold tracking-tight">
                {step.actionText ?? `Step ${stepNumber + 1}`}
              </h3>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="mt-2 space-y-4">
        <div className={cn(!isSelected && "hidden")}>
          <StepItemForm
            step={step}
            index={stepNumber}
            onUpdate={onUpdate}
            onReplaceMedia={canReplaceMedia ? handleOpenFilePicker : undefined}
            isReplacing={isReplacing}
          />
        </div>
        <div className={cn(isSelected && "hidden")}>
          <StepListItem
            step={step}
            onReplaceMedia={canReplaceMedia ? handleOpenFilePicker : undefined}
            isReplacing={isReplacing}
          />
        </div>
      </CardContent>

      <div className="absolute top-3 right-3 flex items-center gap-1">
        {actionsMenu(
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(
              "shrink-0",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontalIcon className="h-3.5 w-3.5" />
            <span className="sr-only">Step actions</span>
          </Button>,
        )}
      </div>
    </Card>
  );

  return (
    <>
      {onAddStepBeforeWithType && (
        <div className="pl-6">
          <StepTypeDock onSelect={(type) => onAddStepBeforeWithType(step.id, type)}>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed bg-background text-muted-foreground hover:text-foreground"
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              Add Step
            </Button>
          </StepTypeDock>
        </div>
      )}

      <div ref={setNodeRef} style={style} className="group flex items-start gap-2">
        <div
          className="mt-3 cursor-grab touch-none opacity-0 transition-all duration-300 group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
        </div>

        {isAlertLikeCanvasStep ? canvasStep : cardStep}
        {filePicker}
      </div>
    </>
  );
}
