import type { Step } from "@repo/api-client";

import type { StepTypeOption } from "@/models";
import { GuideTimelineEmpty } from "./guide-timeline-empty";
import { GuideTimelineSkeleton } from "./guide-timeline-skeleton";
import { GuideWorkflowTimeline } from "./guide-workflow-timeline";

type Props = {
	steps: Step[];
	stepsLoading?: boolean;
	selectedStepId?: string | null;
	onSelectStep?: (stepId: string | null) => void;
	onUpdateStep?: (stepId: string, updates: Record<string, unknown>) => void;
	onAddStepWithType?: (type: StepTypeOption) => void;
	onAddStepBeforeWithType?: (stepId: string, type: StepTypeOption) => void;
	onDeleteStep?: (stepId: string) => void;
	onDuplicateStep?: (stepId: string) => void;
	onRecaptureStep?: (stepId: string) => void;
	onReorderSteps?: (
		targetStepId: string,
		prevStepId: string | null,
		nextStepId: string | null,
	) => void;
};

export function GuideWorkflowEditMode({
	steps,
	stepsLoading = false,
	selectedStepId,
	onSelectStep,
	onUpdateStep,
	onAddStepWithType,
	onAddStepBeforeWithType,
	onDeleteStep,
	onDuplicateStep,
	onRecaptureStep,
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
			selectedStepId={selectedStepId}
			onSelectStep={onSelectStep}
			onUpdateStep={onUpdateStep}
			onAddStepWithType={onAddStepWithType}
			onAddStepBeforeWithType={onAddStepBeforeWithType}
			onDeleteStep={onDeleteStep}
			onDuplicateStep={onDuplicateStep}
			onRecaptureStep={onRecaptureStep}
			onReorderSteps={onReorderSteps}
		/>
	);
}
