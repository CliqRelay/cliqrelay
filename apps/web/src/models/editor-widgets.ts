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

export type EditorWidgetButtonProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  widgetProps: EditorWidgetProps;
  onActiveChange: (active: boolean, trigger?: HTMLElement | null) => void;
};

export type EditorWidgetManifest = {
  id: EditorWidgetId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Custom rail button. Defaults to a button that toggles the panel. */
  button?: ComponentType<EditorWidgetButtonProps>;
  /** Content rendered inside the widget panel. Omit for dialog-only widgets. */
  panel?: ComponentType<EditorWidgetProps>;
};
