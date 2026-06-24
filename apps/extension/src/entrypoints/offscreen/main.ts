import { browser } from "wxt/browser";

import { api } from "@repo/api-client";

import { withCsrf } from "@/lib/csrf";
import {
	type OffscreenCommand,
	type OffscreenEvent,
	validateOffscreenCommand,
} from "@/models/offscreen";
import {
	createUploadQueue,
} from "@/services/offscreen";
import { createScreenshotUploadOrchestrator } from "@/services/upload/screenshot-orchestrator.service";

let activeGuideId: string | undefined;
let guideCreatePromise: Promise<{ guideId: string; isNew: boolean }> | null =
	null;

const orchestrator = createScreenshotUploadOrchestrator(async () => {
	if (activeGuideId) return { guideId: activeGuideId, isNew: false };

	if (guideCreatePromise) {
		const { guideId } = await guideCreatePromise;
		return { guideId, isNew: false };
	}

	const createPromise = (async () => {
		const guideResponse = await api.guides.createGuide(
			{ title: "Untitled Guide" },
			await withCsrf(),
		);
		activeGuideId = guideResponse.guide.id;
		return { guideId: activeGuideId!, isNew: true };
	})();

	guideCreatePromise = createPromise;

	try {
		return await createPromise;
	} finally {
		guideCreatePromise = null;
	}
});

let queue: ReturnType<typeof createUploadQueue> | null = null;

const sendToBackground = (event: OffscreenEvent) => {
	browser.runtime.sendMessage(event).catch(() => {
		// Background may be inactive; ignore
	});
};

const handleCommand = async (command: OffscreenCommand) => {
	switch (command.type) {
		case "start_session": {
			activeGuideId = command.guideId;
			queue = createUploadQueue(orchestrator, sendToBackground);
			break;
		}
		case "process_capture": {
			if (!queue) {
				console.warn("[offscreen] No active session, ignoring capture");
				return;
			}
			queue.addJob({
				jobId: command.jobId,
				capture: command.capture,
				screenshotDataUrl: command.screenshotDataUrl,
				tabId: command.tabId,
				guideId: activeGuideId,
			});
			break;
		}
		case "stop_session": {
			if (queue) {
				queue.flush();
				const state = queue.getState();
				sendToBackground({
					type: "drain_complete",
					total: state.completed + state.failed,
					succeeded: state.completed,
					failed: state.failed,
				});
				queue.stop();
				queue = null;
			}
			break;
		}
		case "get_state": {
			if (!queue) {
				sendToBackground({
					type: "session_state",
					pending: 0,
					active: 0,
					completed: 0,
					failed: 0,
				});
				return;
			}
			sendToBackground({
				type: "session_state",
				...queue.getState(),
			});
			break;
		}
	}
};

browser.runtime.onMessage.addListener((message: unknown) => {
	const validationResult = validateOffscreenCommand(message);
	if (!validationResult.success) {
		return;
	}
	const command = validationResult.value;
	void handleCommand(command);
});

console.log("[offscreen] Offscreen document initialized");
