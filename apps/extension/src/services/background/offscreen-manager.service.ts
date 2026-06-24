import { browser } from "wxt/browser";

import type { CaptureBridgeMessage } from "@/models";
import type { OffscreenCommand, OffscreenEvent } from "@/models/offscreen";
import { getChromeOffscreen } from "@/utils/message";

export type OffscreenManager = ReturnType<typeof createOffscreenManager>;

export const createOffscreenManager = (
	onEvent: (event: OffscreenEvent) => void,
) => {
	let sessionId: string | null = null;
	let offscreenApi: ReturnType<typeof getChromeOffscreen> = null;

	const checkAvailability = (): boolean => {
		offscreenApi = getChromeOffscreen();
		return offscreenApi !== null;
	};

	const startSession = async (
		newSessionId: string,
		guideId?: string,
	): Promise<boolean> => {
		if (!checkAvailability()) {
			return false;
		}

		try {
			const hasDoc = await offscreenApi!.hasDocument();
			if (!hasDoc) {
				await offscreenApi!.createDocument({
					url: browser.runtime.getURL("/offscreen.html"),
					reasons: ["BLOBS"],
					justification:
						"Process screenshot uploads reliably across service worker restarts",
				});
			}

			sessionId = newSessionId;

			await browser.runtime.sendMessage({
				type: "start_session",
				sessionId,
				...(guideId ? { guideId } : {}),
			} satisfies OffscreenCommand);

			return true;
		} catch (error) {
			console.warn("[background] Failed to start offscreen session:", error);
			sessionId = null;
			return false;
		}
	};

	const sendJob = async (
		jobId: string,
		capture: CaptureBridgeMessage,
		screenshotDataUrl: string,
		tabId: number,
	): Promise<void> => {
		if (!offscreenApi || !sessionId) {
			return;
		}

		try {
			await browser.runtime.sendMessage({
				type: "process_capture",
				jobId,
				capture,
				screenshotDataUrl,
				tabId,
			} satisfies OffscreenCommand);
		} catch (error) {
			console.warn("[background] Failed to send job to offscreen:", error);
		}
	};

	const stopSession = async (): Promise<void> => {
		if (!offscreenApi || !sessionId) {
			return;
		}

		try {
			await browser.runtime.sendMessage({
				type: "stop_session",
			} satisfies OffscreenCommand);
		} catch {
			// Offscreen may already be closed
		}

		sessionId = null;
	};

	const closeDocument = async (): Promise<void> => {
		if (!offscreenApi) {
			return;
		}

		try {
			await offscreenApi.closeDocument();
		} catch {
			// May already be closed
		}
	};

	const syncState = async (): Promise<void> => {
		if (!offscreenApi) {
			return;
		}

		try {
			const hasDoc = await offscreenApi.hasDocument();
			if (!hasDoc) {
				return;
			}

			await browser.runtime.sendMessage({
				type: "get_state",
			} satisfies OffscreenCommand);
		} catch {
			// Offscreen may be unavailable
		}
	};

	const getSessionId = (): string | null => sessionId;

	return {
		startSession,
		sendJob,
		stopSession,
		closeDocument,
		syncState,
		getSessionId,
	};
};
