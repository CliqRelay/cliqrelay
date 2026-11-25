import { AnimatedPhaseBadge } from "./AnimatedPhaseBadge";
import { StepCard } from "./StepCard";
import { StepCardMenu } from "./StepCardMenu";
import type { StepJobProgress } from "@/models";

type Props = {
  step: StepJobProgress;
  stepNumber: number;
  onDelete?: (stepId: string, actionText?: string | null) => void;
  onDismiss?: (jobId: string) => void;
};

export function StepCardRecording({ step, stepNumber, onDelete, onDismiss }: Props) {
  const isSynced = step.phase === "completed";

  const trailing = isSynced ? (
    onDelete && (
      <StepCardMenu label="Delete" onSelect={() => onDelete(step.jobId, step.actionText)} />
    )
  ) : (
    <>
      <AnimatedPhaseBadge phase={step.phase} error={step.error} />
      {onDismiss && <StepCardMenu label="Dismiss" onSelect={() => onDismiss(step.jobId)} />}
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
