import { browser } from "wxt/browser";

import type { OffscreenJob } from "@/models/offscreen";

const SESSION_STORAGE_KEY = "offscreen_session";

type PersistedSessionState = {
	sessionId: string;
	guideId?: string;
	pendingJobs: OffscreenJob[];
};

export const saveSessionState = async (
	sessionId: string,
	guideId: string | undefined,
	pendingJobs: OffscreenJob[],
): Promise<void> => {
	try {
		await browser.storage.session.set({
			[SESSION_STORAGE_KEY]: { sessionId, guideId, pendingJobs },
		} satisfies Record<string, PersistedSessionState>);
	} catch (error) {
		console.warn("[session-persistence] Failed to save session state:", error);
	}
};

export const loadSessionState =
	async (): Promise<PersistedSessionState | null> => {
		try {
			const result = await browser.storage.session.get(SESSION_STORAGE_KEY);
			return (result[SESSION_STORAGE_KEY] as PersistedSessionState) ?? null;
		} catch {
			return null;
		}
	};

export const clearSessionState = async (): Promise<void> => {
	try {
		await browser.storage.session.remove(SESSION_STORAGE_KEY);
	} catch {
		// Ignore cleanup errors
	}
};
