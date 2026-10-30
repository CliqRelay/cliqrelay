import { create } from "zustand";

interface EditorState {
  guideId: string | null;
  selectedStepId: string | null;
  dirtyStepIds: Record<string, boolean>;
  activeWidgetId: string | null;

  setGuideId: (guideId: string) => void;
  setSelectedStepId: (stepId: string | null) => void;
  markClean: (stepId: string) => void;
  toggleWidget: (widgetId: string) => void;
  closeWidget: () => void;
  reset: () => void;
}

const initialState = {
  guideId: null as string | null,
  selectedStepId: null as string | null,
  dirtyStepIds: {} as Record<string, boolean>,
  activeWidgetId: null as string | null,
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,

  setGuideId: (guideId) => set({ guideId }),

  setSelectedStepId: (selectedStepId) => set({ selectedStepId }),

  markClean: (stepId) =>
    set((state) => {
      const { [stepId]: _, ...rest } = state.dirtyStepIds;
      return { dirtyStepIds: rest };
    }),

  toggleWidget: (widgetId) =>
    set((state) => ({
      activeWidgetId: state.activeWidgetId === widgetId ? null : widgetId,
    })),

  closeWidget: () => set({ activeWidgetId: null }),

  reset: () => set(initialState),
}));
