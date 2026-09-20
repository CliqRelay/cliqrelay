import type { Step } from "@repo/api-client";

import { GuideTimelineEmpty } from "./guide-timeline-empty";
import { GuideTimelineSkeleton } from "./guide-timeline-skeleton";
import { GuideWorkflowTimeline } from "./guide-workflow-timeline";
import type { StepTypeOption } from "@/models";

type Props = {
  steps: Step[];
  stepsLoading?: boolean;
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
  onRecaptureStep?: (stepId: string) => void;
  onReplaceStepMedia?: (stepId: string, file: File) => void;
  replacingStepIds?: string[];
  onReorderSteps?: (
    targetStepId: string,
    prevStepId: string | null,
    nextStepId: string | null,
  ) => void;
};

export function GuideWorkflowEditMode({
  steps,
  stepsLoading = false,
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
  onRecaptureStep,
  onReplaceStepMedia,
  replacingStepIds,
  onReorderSteps,
}: Props) {
  if (stepsLoading) {
    return <GuideTimelineSkeleton />;
  }

  if (steps.length === 0) {
    return <GuideTimelineEmpty onAddStepWithType={onAddStepWithType!} />;
  }

  return (
    <GuideWorkflowTimeline
      steps={steps}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      selectedStepId={selectedStepId}
      onSelectStep={onSelectStep}
      onUpdateStep={onUpdateStep}
      onAddStepWithType={onAddStepWithType}
      onAddStepBeforeWithType={onAddStepBeforeWithType}
      onDeleteStep={onDeleteStep}
      onDuplicateStep={onDuplicateStep}
      onRecaptureStep={onRecaptureStep}
      onReplaceStepMedia={onReplaceStepMedia}
      replacingStepIds={replacingStepIds}
      onReorderSteps={onReorderSteps}
    />
  );
}
