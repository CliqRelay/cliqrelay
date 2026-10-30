import type { ComponentType } from "react";

import type { Guide, Step } from "@repo/api-client";

export type EditorWidgetId = string;

export type EditorWidgetProps = {
  guide: Guide;
  steps: Step[];
  stepsLoading: boolean;
  selectedStepId: string | null;
  onSelectStep: (stepId: string | null) => void;
};

export type EditorWidgetManifest = {
  id: EditorWidgetId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType<EditorWidgetProps>;
};

export const CORE_WIDGET_MANIFESTS = [] as const satisfies readonly EditorWidgetManifest[];
