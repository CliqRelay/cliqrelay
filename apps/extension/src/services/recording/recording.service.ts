import type {
	BufferedCapture,
	RecordingFlushResult,
	RecordingSnapshot,
	RecordingStateMachine,
	RecordingStatus,
} from "@/models";

const createSnapshot = (
	status: RecordingStatus,
	bufferedCount: number,
): RecordingSnapshot => ({
	status,
	bufferedCount,
});

export const createRecordingStateMachine = (
	initialStatus: RecordingStatus = "recording",
): RecordingStateMachine => {
	let status = initialStatus;
	let bufferedEvents: BufferedCapture[] = [];
	let processBufferedCapture:
		| ((captures: BufferedCapture[]) => Promise<void>)
		| undefined;

	const getSnapshot = () => createSnapshot(status, bufferedEvents.length);

	const setStatus = (nextStatus: RecordingStatus) => {
		status = nextStatus;
		return getSnapshot();
	};

	return {
		getSnapshot,
		start: () => {
			bufferedEvents = [];
			return setStatus("recording");
		},
		pause: () => setStatus("paused"),
		resume: () => setStatus("recording"),
		stop: () => {
			bufferedEvents = [];
			return setStatus("stopped");
		},
		flush: async (): Promise<RecordingFlushResult> => {
			const flushedEvents = bufferedEvents;
			bufferedEvents = [];
			if (processBufferedCapture && flushedEvents.length > 0) {
				await processBufferedCapture(flushedEvents);
			}

			return {
				snapshot: getSnapshot(),
				flushedEvents,
			};
		},
		ingestCapture: (capture: BufferedCapture) => {
			if (status !== "recording") {
				bufferedEvents.push(capture);
			}
		},
		setProcessBufferedCapture: (
			fn: (captures: BufferedCapture[]) => Promise<void>,
		) => {
			processBufferedCapture = fn;
		},
	};
};
