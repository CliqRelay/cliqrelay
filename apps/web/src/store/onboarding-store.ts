import { create } from "zustand";

import type { OnboardingChecklistItemType } from "@/models";

const STORAGE_KEY = "cliqrelay:onboarding";

interface OnboardingState {
	dismissed: boolean;
	completedSteps: OnboardingChecklistItemType[];
	hydrated: boolean;
	dismiss: () => void;
	completeStep: (itemId: OnboardingChecklistItemType) => void;
	rehydrate: () => void;
	reset: () => void;
}

function hydrate(): Pick<OnboardingState, "dismissed" | "completedSteps"> {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return {
				dismissed: parsed.dismissed ?? false,
				completedSteps: Array.isArray(parsed.completedSteps)
					? parsed.completedSteps
					: [],
			};
		}
	} catch {
		// ignore parse errors
	}
	return { dismissed: false, completedSteps: [] };
}

function persist(state: Pick<OnboardingState, "dismissed" | "completedSteps">) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// ignore write errors
	}
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
	dismissed: false,
	completedSteps: [],
	hydrated: false,
	dismiss: () =>
		set((prev) => {
			const next = { ...prev, dismissed: true };
			persist(next);
			return next;
		}),
	completeStep: (type: OnboardingChecklistItemType) =>
		set((prev) => {
			if (prev.completedSteps.includes(type)) {
				return prev;
			}
			const next = {
				...prev,
				completedSteps: [...prev.completedSteps, type],
			};
			persist(next);
			return next;
		}),
	rehydrate: () =>
		set(() => {
			const stored = hydrate();
			return { ...stored, hydrated: true };
		}),
	reset: () => {
		localStorage.removeItem(STORAGE_KEY);
		set({ dismissed: false, completedSteps: [], hydrated: true });
	},
}));
