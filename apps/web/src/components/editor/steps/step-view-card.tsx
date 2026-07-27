import { ExternalLink } from "lucide-react";

import type { Step } from "@repo/api-client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { parseTextSegments } from "@/utils/regex.utils";
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

	const isNavigationStep =
		step.type === "interaction" && step.action === "navigation";

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
						{step.actionText
							? parseTextSegments(step.actionText).map((segment, i) =>
									segment.type === "url" && isNavigationStep ? (
										<a
											key={i}
											href={segment.value}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded break-all"
										>
											{segment.value}
											<ExternalLink className="h-3.5 w-3.5 shrink-0" />
										</a>
									) : (
										<span key={i}>{segment.value}</span>
									),
								)
							: `Step ${stepNumber}`}
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
