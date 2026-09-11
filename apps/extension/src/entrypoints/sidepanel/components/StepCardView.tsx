import type { Step } from "@repo/api-client";

import { StepCard } from "./StepCard";
import { StepCardMenu } from "./StepCardMenu";

type Props = {
	step: Step;
	stepNumber: number;
	onDelete?: (id: string, actionText?: string | null) => void;
};

export function StepCardView({ step, stepNumber, onDelete }: Props) {
	const media = step.mediaAssets?.[0];

	return (
		<StepCard
			stepNumber={stepNumber}
			action={step.action}
			actionText={step.actionText}
			url={step.url}
			screenshotUrl={media?.url}
			thumbnail={media?.thumbnail}
			targetElement={step.targetElement}
			trailing={
				onDelete && (
					<StepCardMenu
						label="Delete"
						onSelect={() => onDelete(step.id, step.actionText)}
					/>
				)
			}
		/>
	);
}
