import type { StepJobProgress } from "@/models";
import { CompletedStepCard } from "./CompletedStepCard";
import { ProgressStepCard } from "./ProgressStepCard";

type Props = {
	step: StepJobProgress;
	stepNumber: number;
	onDelete?: (stepId: string, actionText?: string | null) => void;
	onDismiss?: (jobId: string) => void;
};

export function StepCardRecording({ step, stepNumber, onDelete, onDismiss }: Props) {
	const isCompleted = step.phase === "completed";
	const persistedStepId = step.stepId;

	if (isCompleted && persistedStepId) {
		return (
			<CompletedStepCard
				step={step}
				stepNumber={stepNumber}
				onDelete={onDelete}
			/>
		);
	}

	return (
		<ProgressStepCard
			step={step}
			stepNumber={stepNumber}
			onDismiss={onDismiss}
		/>
	);
}
