import type { ComponentType } from "react";

import type { Guide, Step } from "@repo/api-client";

export type EditorWidgetId = string;

export type EditorWidgetProps = {
  guide: Guide;
  steps: Step[];
  stepsLoading: boolean;
  selectedStepId: string | null;
  onSelectStep: (stepId: string | null) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onReorderSteps?: (
    targetStepId: string,
    prevStepId: string | null,
    nextStepId: string | null,
  ) => void;
  onRevealStep?: (stepId: string) => void;
};

export type EditorWidgetManifest = {
  id: EditorWidgetId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType<EditorWidgetProps>;
};
