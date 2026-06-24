import { FileTextIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StepTypeOption } from "@/models";
import { StepTypeDock } from "../steps/step-type-dock";

type Props = {
	onAddStepWithType: (type: StepTypeOption) => void;
};

export function GuideTimelineEmpty({ onAddStepWithType }: Props) {
	return (
		<div className="mx-auto mt-8 max-w-lg">
			<div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed bg-muted/20 px-8 py-20 text-center">
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted shadow-xs">
					<FileTextIcon className="h-7 w-7 text-muted-foreground" />
				</div>
				<div className="w-full space-y-1.5">
					<h3 className="text-lg font-semibold tracking-tight">No steps yet</h3>
					<p className="text-sm text-muted-foreground">
						Start building your guide by adding your first step.
					</p>
				</div>
				<StepTypeDock onSelect={onAddStepWithType}>
					<Button>
						<PlusIcon className="mr-2 h-4 w-4" />
						Add Step
					</Button>
				</StepTypeDock>
			</div>
		</div>
	);
}
