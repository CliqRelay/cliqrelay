import type { StepJobProgress } from "@/models";
import { AnimatedPhaseBadge } from "./AnimatedPhaseBadge";
import { StepCard } from "./StepCard";
import { StepCardMenu } from "./StepCardMenu";

type Props = {
	step: StepJobProgress;
	stepNumber: number;
	onDelete?: (stepId: string, actionText?: string | null) => void;
	onDismiss?: (jobId: string) => void;
};

export function StepCardRecording({ step, stepNumber, onDelete, onDismiss }: Props) {
	const persistedStepId = step.phase === "completed" ? step.stepId : undefined;

	const trailing = persistedStepId ? (
		onDelete && (
			<StepCardMenu
				label="Delete"
				onSelect={() => onDelete(persistedStepId, step.actionText)}
			/>
		)
	) : (
		<>
			<AnimatedPhaseBadge phase={step.phase} error={step.error} />
			{onDismiss && (
				<StepCardMenu label="Dismiss" onSelect={() => onDismiss(step.jobId)} />
			)}
		</>
	);

	return (
		<StepCard
			stepNumber={stepNumber}
			action={step.action}
			actionText={step.actionText}
			url={step.url}
			screenshotUrl={step.screenshotUrl}
			thumbnail={step.thumbnail}
			targetElement={step.targetElement}
			trailing={trailing}
		/>
	);
}
