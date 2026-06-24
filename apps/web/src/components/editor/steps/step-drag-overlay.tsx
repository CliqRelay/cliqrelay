import { GripVerticalIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
	step: Step;
	index: number;
};

function capitalize(type: string) {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

export function StepDragOverlay({ step, index }: Props) {
	return (
		<Card className="shadow-xl">
			<CardContent>
				{step.type === "canvas" ? (
					<div className="flex items-center gap-3">
						<GripVerticalIcon className="h-4 w-4 text-muted-foreground shrink-0" />
						<h3 className="truncate text-xl font-semibold tracking-tight">
							{step.canvasContent
								? capitalize(step.canvasContent.type)
								: "Canvas"}
						</h3>
					</div>
				) : (
					<div className="flex items-center gap-3">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
							{index + 1}
						</div>
						<h3 className="truncate text-xl font-semibold tracking-tight">
							{step.actionText ?? `Step ${index + 1}`}
						</h3>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
