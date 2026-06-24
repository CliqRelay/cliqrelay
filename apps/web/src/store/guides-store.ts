import { create } from "zustand";

export type FilterOption = "all" | "draft" | "published" | "archived";

interface GuidesState {
	filter: FilterOption;
	setFilter: (filter: FilterOption) => void;
}

export const useGuidesStore = create<GuidesState>((set) => ({
	filter: "all",
	setFilter: (filter) => set({ filter }),
}));
