import type { Step } from "@repo/api-client";

import { CanvasStepPreview } from "./canvas-step-preview";
import { StepMedia } from "./step-media";

type Props = {
	step: Step;
};

export function StepListItem({ step }: Props) {
	if (step.type === "canvas") {
		return <CanvasStepPreview step={step} />;
	}

	return <StepMedia step={step} />;
}
