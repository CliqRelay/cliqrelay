import type { Step } from "@repo/api-client";

import { CanvasStepPreview } from "./canvas-step-preview";
import { StepMedia } from "./step-media";

type Props = {
	step: Step;
	onReplaceMedia?: () => void;
	isReplacing?: boolean;
};

export function StepListItem({ step, onReplaceMedia, isReplacing }: Props) {
	if (step.type === "canvas") {
		return <CanvasStepPreview step={step} />;
	}

	return (
		<StepMedia
			step={step}
			onReplaceMedia={onReplaceMedia}
			isReplacing={isReplacing}
		/>
	);
}
