import { create } from "zustand";

import type {
	SidePanelActions,
	SidePanelState,
	UploadQueueInfo,
} from "@/models";

const initialUploadQueue: UploadQueueInfo = {
	pending: 0,
	inProgress: 0,
	failed: 0,
	completed: 0,
};

const initialState: SidePanelState = {
	status: undefined,
	bufferedCount: 0,
	isDraining: false,
	settings: undefined,
	uploadQueue: initialUploadQueue,
	activeGuideId: null,
	jobProgress: [],
};

export const useSidePanelStore = create<SidePanelState & SidePanelActions>(
	(set) => ({
		...initialState,
		setStatus: (status) => set({ status }),
		setBufferedCount: (bufferedCount) => set({ bufferedCount }),
		setIsDraining: (isDraining) => set({ isDraining }),
		setSettings: (settings) => set({ settings }),
		setUploadQueue: (uploadQueue) => set({ uploadQueue }),
		setActiveGuideId: (activeGuideId) => set({ activeGuideId }),
		setJobProgress: (jobProgress) => set({ jobProgress }),
		updateJobProgress: (jobId, updates) =>
			set((s) => ({
				jobProgress: s.jobProgress.map((jp) =>
					jp.jobId === jobId ? { ...jp, ...updates } : jp,
				),
			})),
		removeJobProgress: (jobId) =>
			set((s) => ({
				jobProgress: s.jobProgress.filter((jp) => jp.jobId !== jobId),
			})),
		clear: () => set(initialState),
	}),
);
