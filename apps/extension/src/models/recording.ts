import { z } from "zod";

import type { BufferedCapture } from "@/models/capture";

export const recordingStatusValues = [
	"idle",
	"recording",
	"paused",
	"stopped",
] as const;

export const recordingStatusSchema = z.enum(recordingStatusValues);
export type RecordingStatus = z.infer<typeof recordingStatusSchema>;

export type RecordingSnapshot = {
	status: RecordingStatus;
	bufferedCount: number;
};

export type RecordingFlushResult = {
	snapshot: RecordingSnapshot;
	flushedEvents: BufferedCapture[];
};

export type RecordingStateMachine = {
	getSnapshot: () => RecordingSnapshot;
	start: () => RecordingSnapshot;
	pause: () => RecordingSnapshot;
	resume: () => RecordingSnapshot;
	stop: () => RecordingSnapshot;
	flush: () => Promise<RecordingFlushResult>;
	ingestCapture: (capture: BufferedCapture) => void;
	setProcessBufferedCapture: (
		fn: (captures: BufferedCapture[]) => Promise<void>,
	) => void;
};
