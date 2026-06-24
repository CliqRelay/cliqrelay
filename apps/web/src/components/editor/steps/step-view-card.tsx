import type { Step } from "@repo/api-client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CanvasStepPreview } from "./canvas-step-preview";
import { StepMedia } from "./step-media";
import { StepNotes } from "./step-notes";

type Props = {
	step: Step;
	stepNumber: number;
};

export function GuideWorkflowViewStep({ step, stepNumber }: Props) {
	const isCanvasStep = step.type === "canvas";
	if (isCanvasStep) {
		return <CanvasStepPreview step={step} />;
	}

	return (
		<Card>
			<CardHeader
				className={cn(
					"flex flex-row justify-start items-center gap-4",
					!!step.mediaAssets?.length && "border-b",
				)}
			>
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-base font-bold text-foreground border border-muted-foreground">
						{stepNumber}
					</div>
					<h3 className="w-full text-base font-semibold tracking-tight break-all">
						{step.actionText || `Step ${stepNumber}`}
					</h3>
				</div>
			</CardHeader>
			{!!step.mediaAssets?.length && (
				<CardContent className="space-y-4">
					<StepMedia step={step} />
					{step.notes && <StepNotes notes={step.notes} />}
				</CardContent>
			)}
		</Card>
	);
}
