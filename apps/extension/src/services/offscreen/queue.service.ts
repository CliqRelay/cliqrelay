import { AsyncQueuer } from "@tanstack/pacer";

import type {
	OffscreenEvent,
	OffscreenJob,
	OffscreenJobResult,
} from "@/models/offscreen";
import type { ScreenshotUploadOrchestrator } from "@/services/upload/screenshot-orchestrator.service";
import {
	UPLOAD_CONCURRENCY,
	UPLOAD_MAX_ATTEMPTS,
	UPLOAD_MAX_SIZE,
} from "@/utils/constants";

export type UploadQueue = ReturnType<typeof createUploadQueue>;
export type ProgressCallback = (event: OffscreenEvent) => void;

export const createUploadQueue = (
	orchestrator: ScreenshotUploadOrchestrator,
	onProgress: ProgressCallback,
) => {
	const processFn = (job: OffscreenJob) =>
		orchestrator.processCaptureForUpload(job.screenshotDataUrl, job.capture);

	const queue = new AsyncQueuer<OffscreenJob>(
		async (job) => {
			const result = await processFn(job);
			return result;
		},
		{
			concurrency: UPLOAD_CONCURRENCY,
			maxSize: UPLOAD_MAX_SIZE,
			started: true,
			asyncRetryerOptions: {
				backoff: "exponential",
				baseWait: 1000,
				maxAttempts: UPLOAD_MAX_ATTEMPTS,
				jitter: 0.2,
			},
			onSuccess: (_result, job) => {
				const result = _result as OffscreenJobResult;
				onProgress({
					type: "job_completed",
					jobId: job.jobId,
					storagePath: result.storagePath,
					screenshotUrl: result.screenshotUrl,
					stepId: result.stepId,
					guideId: result.guideId,
					actionText: result.actionText,
					thumbnail: result.thumbnailBase64,
					navStepId: result.navStepId,
					navUrl: result.navUrl,
					navCapturedAt: result.navCapturedAt,
					navScreenshotUrl: result.navScreenshotUrl,
					navThumbnail: result.navThumbnail,
				});
			},
			onError: (error, job) => {
				onProgress({
					type: "job_failed",
					jobId: job.jobId,
					error: error instanceof Error ? error.message : String(error),
					attempt: queue.store.state.errorCount,
				});
			},
			onSettled: () => {
				const state = queue.store.state;
				onProgress({
					type: "session_state",
					pending: state.items.length,
					active: state.activeItems.length,
					completed: state.successCount,
					failed: state.errorCount,
				});
			},
		},
	);

	const addJob = (job: OffscreenJob) => {
		queue.addItem(job);
	};

	const stop = () => {
		queue.stop();
	};

	const getState = () => {
		const state = queue.store.state;
		return {
			pending: state.items.length,
			active: state.activeItems.length,
			completed: state.successCount,
			failed: state.errorCount,
		};
	};

	const clear = () => {
		queue.clear();
	};

	const flush = () => {
		queue.flush();
	};

	return { queue, addJob, stop, getState, clear, flush };
};
