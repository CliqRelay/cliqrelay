import { create } from "zustand";

import type { SidePanelActions, SidePanelState } from "@/models";

const initialState: SidePanelState = {
  settings: undefined,
};

export const useSidePanelStore = create<SidePanelState & SidePanelActions>((set) => ({
  ...initialState,
  setSettings: (settings) => set({ settings }),
}));
