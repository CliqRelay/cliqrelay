import {
	type CaptureBridgeMessage,
	type OffscreenEvent,
	type SidePanelCommand,
	validateCaptureBridgeMessage,
	validateOffscreenEvent,
	validateSidePanelCommand,
} from "@/models";

type OffscreenApi = {
	createDocument: (options: {
		url: string;
		reasons: string[];
		justification: string;
	}) => Promise<void>;
	closeDocument: () => Promise<void>;
	hasDocument: () => Promise<boolean>;
	Reason: Record<string, string>;
};

export const getChromeOffscreen = (): OffscreenApi | null => {
	const c = (globalThis as Record<string, unknown>).chrome;
	if (!c || typeof c !== "object") {
		return null;
	}

	const offscreen = (c as Record<string, unknown>).offscreen;
	if (!offscreen) {
		return null;
	}

	return offscreen as OffscreenApi;
};

export const isCaptureBridgeMessage = (
	message: unknown,
): message is CaptureBridgeMessage => {
	return (
		validateCaptureBridgeMessage(message).success &&
		(message as CaptureBridgeMessage).source === "content-script"
	);
};

export const isSidePanelCommand = (
	message: unknown,
): message is SidePanelCommand => {
	return validateSidePanelCommand(message).success;
};

export const isOffscreenEvent = (message: unknown): message is OffscreenEvent =>
	validateOffscreenEvent(message).success;
