import { Activity } from "react";

import type { Guide } from "@repo/api-client";

import { GuideHeader } from "./guide-header";
import { GuideWorkflowEditMode } from "./guide-workflow-edit-mode";
import { GuideWorkflowViewMode } from "./guide-workflow-view-mode";
import { useGuideStepMutations } from "@/hooks/useGuideStepMutations";
import { useStepEditor } from "@/hooks/useStepEditor";
import { useStepMediaReplace } from "@/hooks/useStepMediaReplace";

type Props = {
  guide: Guide;
  mode: "view" | "edit";
  onModeChange?: (mode: "view" | "edit") => void;
  onUpdateGuide?: (updates: { title?: string; description?: string | null }) => void;
};

export function GuideEditor({ guide, mode, onUpdateGuide }: Props) {
  const {
    steps,
    totalSteps,
    selectedStepId,
    isLoading: stepsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    selectStep,
  } = useStepEditor(guide.id);

  const { handleAddStepWithType, handleSave, handleDelete, handleDuplicate, handleReorder } =
    useGuideStepMutations(guide.id);
  const { handleReplaceMedia, replacingStepId } = useStepMediaReplace(guide.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <GuideHeader
        guide={guide}
        isEditMode={mode === "edit"}
        stepCount={totalSteps}
        onUpdateGuide={mode === "edit" ? onUpdateGuide : undefined}
      />

      <div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />

      <Activity mode={mode === "edit" ? "visible" : "hidden"}>
        <GuideWorkflowEditMode
          steps={steps}
          stepsLoading={stepsLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          selectedStepId={selectedStepId}
          onSelectStep={selectStep}
          onUpdateStep={handleSave}
          onAddStepWithType={(type) => handleAddStepWithType(type, selectStep)}
          onAddStepBeforeWithType={(stepId, type) =>
            handleAddStepWithType(type, selectStep, stepId)
          }
          onDeleteStep={(stepId) => handleDelete(stepId, selectedStepId, selectStep)}
          onDuplicateStep={(stepId) => handleDuplicate(stepId)}
          onReplaceStepMedia={handleReplaceMedia}
          replacingStepId={replacingStepId}
          onReorderSteps={handleReorder}
        />
      </Activity>

      <Activity mode={mode === "view" ? "visible" : "hidden"}>
        <GuideWorkflowViewMode
          steps={steps}
          stepsLoading={stepsLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      </Activity>
    </div>
  );
}
