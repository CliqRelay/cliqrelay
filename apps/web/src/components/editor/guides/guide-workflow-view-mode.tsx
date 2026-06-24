import { FileTextIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import { GuideTimelineSkeleton } from "./guide-timeline-skeleton";
import { GuideWorkflowViewStep } from "../steps/step-view-card";

type Props = {
	steps: Step[];
	stepsLoading?: boolean;
};

export function GuideWorkflowViewMode({ steps, stepsLoading = false }: Props) {
	const stepsMap = new Map(
		steps
			.filter((step) => step.type === "interaction")
			.map((step, index) => [step.id, index + 1]),
	);

	if (stepsLoading) {
		return <GuideTimelineSkeleton />;
	}

	if (steps.length === 0) {
		return (
			<div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
				<FileTextIcon className="h-10 w-10 text-muted-foreground/50" />
				<p className="text-sm text-muted-foreground">No steps yet</p>
			</div>
		);
	}

	return (
		<div className="relative mt-10 flex flex-col gap-6">
			{steps.map((step, index) => (
				<GuideWorkflowViewStep
					key={step.id}
					step={step}
					stepNumber={stepsMap.get(step.id) ?? index + 1}
				/>
			))}
		</div>
	);
}
