import type {
	RecordingSnapshot,
	SidePanelStateUpdate,
	StateUpdateBuilder,
	StepJobProgress,
	UploadQueueSnapshot,
} from "@/models";

export const createStateUpdateBuilder = (
	getRecordingSnapshot: () => RecordingSnapshot,
	getUploadQueueSnapshot: () => UploadQueueSnapshot,
	getActiveGuideId: () => Promise<string | undefined>,
	getJobProgress: () => StepJobProgress[],
	getIsDraining: () => boolean,
): StateUpdateBuilder => {
	return async (): Promise<SidePanelStateUpdate> => {
		const snapshot = getRecordingSnapshot();
		const queueSnapshot = getUploadQueueSnapshot();

		return {
			status: snapshot.status,
			bufferedCount: snapshot.bufferedCount,
			isDraining: getIsDraining(),
			activeGuideId: await getActiveGuideId(),
			uploadQueue: {
				pending: queueSnapshot.pending,
				inProgress: queueSnapshot.inProgress,
				failed: queueSnapshot.failed,
				completed: queueSnapshot.completed,
			},
			jobProgress: getJobProgress(),
		};
	};
};

export type { StateUpdateBuilder };
