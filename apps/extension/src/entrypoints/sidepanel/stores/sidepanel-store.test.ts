import { describe, expect, test } from "vitest";

import { useSidePanelStore } from "./sidepanel-store";

describe("sidepanel store", () => {
	test("initial state has undefined status, empty captures, and zero upload queue", () => {
		const state = useSidePanelStore.getState();
		expect(state.status).toBeUndefined();
		expect(state.bufferedCount).toBe(0);
		expect(state.uploadQueue).toEqual({
			pending: 0,
			inProgress: 0,
			failed: 0,
			completed: 0,
		});
	});

	test("setStatus updates the recording status", () => {
		useSidePanelStore.getState().setStatus("recording");
		expect(useSidePanelStore.getState().status).toBe("recording");
	});

	test("setBufferedCount updates the count", () => {
		useSidePanelStore.getState().setBufferedCount(5);
		expect(useSidePanelStore.getState().bufferedCount).toBe(5);
	});

	test("setUploadQueue updates upload queue info", () => {
		useSidePanelStore
			.getState()
			.setUploadQueue({ pending: 3, inProgress: 0, failed: 1, completed: 5 });
		expect(useSidePanelStore.getState().uploadQueue).toEqual({
			pending: 3,
			inProgress: 0,
			failed: 1,
			completed: 5,
		});
	});

	test("clear resets to initial state", () => {
		useSidePanelStore.getState().setStatus("recording");
		useSidePanelStore.getState().clear();
		const state = useSidePanelStore.getState();
		expect(state.status).toBeUndefined();
	});
});
