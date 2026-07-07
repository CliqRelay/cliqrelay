import type { CaptureBridgeMessage } from "@/models";
import type { OffscreenEvent, OffscreenJob } from "@/models/offscreen";
import { createScreenshotUploadOrchestrator } from "@/services/upload/screenshot-orchestrator.service";

import { createUploadQueue } from "./queue.service";
import {
	clearSessionState,
	loadSessionState,
	saveSessionState,
} from "./session-persistence.service";

export const createOffscreenRuntime = (
	deps: {
		onEvent: (event: OffscreenEvent) => void;
		getOrCreateGuideId: () => Promise<{
			guideId: string;
			isNew: boolean;
		}>;
	},
) => {
	let activeSessionId: string | undefined;
	let activeGuideId: string | undefined;
	let pendingJobs: OffscreenJob[] = [];
	let queue: ReturnType<typeof createUploadQueue> | null = null;

	const orchestrator = createScreenshotUploadOrchestrator(deps.getOrCreateGuideId);

	const persist = () => {
		if (activeSessionId) {
			saveSessionState(activeSessionId, activeGuideId, pendingJobs);
		}
	};

	const handleEvent = (event: OffscreenEvent) => {
		if (event.type === "job_completed" || event.type === "job_failed") {
			pendingJobs = pendingJobs.filter((j) => j.jobId !== event.jobId);
		}
		persist();
		deps.onEvent(event);
	};

	(async () => {
		try {
			const saved = await loadSessionState();
			if (saved && !activeSessionId) {
				activeSessionId = saved.sessionId;
				activeGuideId = saved.guideId;
				pendingJobs = [...saved.pendingJobs];
				if (pendingJobs.length > 0) {
					queue = createUploadQueue(orchestrator, handleEvent);
					for (const job of pendingJobs) {
						queue.addJob(job);
					}
				}
			}
		} catch {
			// Restoration errors are non-fatal
		}
	})();

	return {
		startSession: (sessionId: string, guideId?: string) => {
			if (queue) {
				queue.stop();
				queue = null;
			}
			activeSessionId = sessionId;
			activeGuideId = guideId;
			pendingJobs = [];
			queue = createUploadQueue(orchestrator, handleEvent);
			persist();
		},
		sendJob: (
			jobId: string,
			capture: CaptureBridgeMessage,
			screenshotDataUrl: string,
			tabId: number,
		) => {
			if (!queue || !activeSessionId) {
				return;
			}
			const job: OffscreenJob = {
				jobId,
				capture,
				screenshotDataUrl,
				tabId,
				guideId: activeGuideId,
			};
			pendingJobs.push(job);
			queue.addJob(job);
			persist();
		},
		stopSession: () => {
			if (queue) {
				queue.flush();
				const state = queue.getState();
				deps.onEvent({
					type: "drain_complete",
					total: state.completed + state.failed,
					succeeded: state.completed,
					failed: state.failed,
				});
				queue.stop();
				queue = null;
			}
			clearSessionState();
			activeSessionId = undefined;
			activeGuideId = undefined;
			pendingJobs = [];
		},
		getState: () => {
			if (!queue) {
				deps.onEvent({
					type: "session_state",
					pending: 0,
					active: 0,
					completed: 0,
					failed: 0,
				});
				return;
			}
			deps.onEvent({
				type: "session_state",
				...queue.getState(),
			});
		},
		closeDocument: () => {
			// No-op in background context; offscreen document (Chrome)
			// is closed via the chrome.offscreen API from the manager
		},
	};
};
