import { Activity } from "react";

import type { Guide } from "@repo/api-client";

import { GuideHeader } from "./guide-header";
import { GuideWorkflowEditMode } from "./guide-workflow-edit-mode";
import { GuideWorkflowViewMode } from "./guide-workflow-view-mode";
import { useGuideStepMutations } from "@/hooks/useGuideStepMutations";
import { useStepEditor } from "@/hooks/useStepEditor";
import type { AppUser } from "@/models/auth";

type Props = {
	user: AppUser;
	guide: Guide;
	mode: "view" | "edit";
	onModeChange?: (mode: "view" | "edit") => void;
	onUpdateGuide?: (updates: {
		title?: string;
		description?: string | null;
	}) => void;
};

export function GuideEditor({ user, guide, mode, onUpdateGuide }: Props) {
	const {
		steps,
		selectedStepId,
		isLoading: stepsLoading,
		selectStep,
	} = useStepEditor(guide.id);

	const {
		handleAddStepWithType,
		handleSave,
		handleDelete,
		handleDuplicate,
		handleReorder,
	} = useGuideStepMutations(guide.id);

	return (
		<div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
			<GuideHeader
				user={user}
				guide={guide}
				isEditMode={mode === "edit"}
				stepCount={steps.length}
				onUpdateGuide={mode === "edit" ? onUpdateGuide : undefined}
			/>

			<div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />

			<Activity mode={mode === "edit" ? "visible" : "hidden"}>
				<GuideWorkflowEditMode
					steps={steps}
					stepsLoading={stepsLoading}
					selectedStepId={selectedStepId}
					onSelectStep={selectStep}
					onUpdateStep={handleSave}
					onAddStepWithType={(type) => handleAddStepWithType(type, selectStep)}
					onAddStepBeforeWithType={(stepId, type) =>
						handleAddStepWithType(type, selectStep, stepId)
					}
					onDeleteStep={(stepId) =>
						handleDelete(stepId, selectedStepId, selectStep)
					}
					onDuplicateStep={(stepId) => handleDuplicate(stepId)}
					onReorderSteps={handleReorder}
				/>
			</Activity>

			<Activity mode={mode === "view" ? "visible" : "hidden"}>
				<GuideWorkflowViewMode steps={steps} stepsLoading={stepsLoading} />
			</Activity>
		</div>
	);
}
