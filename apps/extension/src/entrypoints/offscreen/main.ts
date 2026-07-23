import { browser } from "wxt/browser";

import { api } from "@repo/api-client";

import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { withCsrf } from "@/lib/csrf";
import { validateOffscreenCommand } from "@/models/offscreen";
import { createOffscreenRuntime } from "@/services/offscreen";

let activeGuideId: string | undefined;
let guideCreatePromise: Promise<{ guideId: string; isNew: boolean }> | null =
	null;

const getOrCreateGuideId =
	async (): Promise<{ guideId: string; isNew: boolean }> => {
		if (activeGuideId) return { guideId: activeGuideId, isNew: false };

		if (guideCreatePromise) {
			const { guideId } = await guideCreatePromise;
			return { guideId, isNew: false };
		}

		const createPromise = (async () => {
			const workspaceId = await getActiveWorkspaceId();
			const guideResponse = await api.guides.createGuide(
				{ title: "Untitled Guide", workspaceId: workspaceId ?? "" },
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
	};

const runtime = createOffscreenRuntime({
	onEvent: (event) => {
		browser.runtime.sendMessage(event).catch(() => {
			// Background may be inactive; ignore
		});
	},
	getOrCreateGuideId,
});

browser.runtime.onMessage.addListener((message: unknown) => {
	const validationResult = validateOffscreenCommand(message);
	if (!validationResult.success) {
		return;
	}
	const command = validationResult.value;
	switch (command.type) {
		case "start_session":
			runtime.startSession(command.sessionId, command.guideId);
			break;
		case "process_capture":
			runtime.sendJob(
				command.jobId,
				command.capture,
				command.screenshotDataUrl,
				command.tabId,
			);
			break;
		case "stop_session":
			runtime.stopSession();
			break;
		case "get_state":
			runtime.getState();
			break;
	}
});

console.log("[offscreen] Offscreen document initialized");
