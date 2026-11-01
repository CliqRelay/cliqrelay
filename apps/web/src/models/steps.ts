import type { Step, StepCanvasType } from "@repo/api-client";

export type StepTypeOption = "step" | StepCanvasType;

export type StepTypeConfig = {
  type: "interaction" | "canvas";
  canvasType?: StepCanvasType;
};

export const STEP_TYPE_CONFIG: Record<StepTypeOption, StepTypeConfig> = {
  step: { type: "interaction" },
  header: { type: "canvas", canvasType: "header" },
  tip: { type: "canvas", canvasType: "tip" },
  callout: { type: "canvas", canvasType: "callout" },
  alert: { type: "canvas", canvasType: "alert" },
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getStepTitle(step: Step, stepNumber: number): string {
  if (step.type === "canvas") {
    const headingText = step.canvasContent?.headingText?.trim();
    if (headingText) {
      return headingText;
    }
    const canvasType = step.canvasContent?.type;
    return canvasType ? capitalize(canvasType) : "Canvas";
  }

  const actionText = step.actionText?.trim();
  return actionText || `Step ${stepNumber}`;
}

export function getReorderNeighbours(
  steps: Pick<Step, "id">[],
  activeId: string,
  overId: string | undefined,
): { targetStepId: string; prevStepId: string | null; nextStepId: string | null } | null {
  if (!overId || activeId === overId) {
    return null;
  }

  const oldIndex = steps.findIndex((step) => step.id === activeId);
  const newIndex = steps.findIndex((step) => step.id === overId);
  if (oldIndex === -1 || newIndex === -1) {
    return null;
  }

  if (oldIndex < newIndex) {
    return {
      targetStepId: activeId,
      prevStepId: steps[newIndex].id,
      nextStepId: steps[newIndex + 1]?.id ?? null,
    };
  }

  return {
    targetStepId: activeId,
    prevStepId: steps[newIndex - 1]?.id ?? null,
    nextStepId: steps[newIndex].id,
  };
}

export function getStepAnchorId(stepId: string): string {
  return `step-${stepId}`;
}
