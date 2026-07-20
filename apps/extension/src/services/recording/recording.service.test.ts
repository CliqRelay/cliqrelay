import { describe, expect, test, vi } from "vitest";

import { CliqRelayEvents } from "@repo/data-commons";

import { createRecordingStateMachine } from "./recording.service";

const createCapture = (tabId: number) => ({
	tabId,
	message: {
		source: "content-script" as const,
		type: CliqRelayEvents.CAPTURE_EVENT,
		payload: {
			action: "click" as const,
			capturedAt: "2026-06-01T12:00:00.000Z",
			url: `https://example.com/${tabId}`,
			tabId: tabId.toString(),
		},
	},
});

describe("recording state machine", () => {
	test("tracks start, pause, resume, stop, and flush transitions", async () => {
		const recording = createRecordingStateMachine("idle");

		expect(recording.getSnapshot()).toEqual({
			status: "idle",
			bufferedCount: 0,
		});

		expect(recording.start()).toEqual({
			status: "recording",
			bufferedCount: 0,
		});

		recording.ingestCapture(createCapture(1));

		expect(recording.pause()).toEqual({
			status: "paused",
			bufferedCount: 0,
		});

		recording.ingestCapture(createCapture(2));
		expect(recording.getSnapshot()).toEqual({
			status: "paused",
			bufferedCount: 1,
		});

		expect(recording.resume()).toEqual({
			status: "recording",
			bufferedCount: 1,
		});

		const flushResult = await recording.flush();
		expect(flushResult.snapshot).toEqual({
			status: "recording",
			bufferedCount: 0,
		});
		expect(flushResult.flushedEvents).toHaveLength(1);

		expect(recording.stop()).toEqual({
			status: "stopped",
			bufferedCount: 0,
		});
	});

	test("buffers events while stopped, clears on start", async () => {
		const recording = createRecordingStateMachine("stopped");

		recording.ingestCapture(createCapture(1));
		expect(recording.getSnapshot()).toEqual({
			status: "stopped",
			bufferedCount: 1,
		});

		await recording.start();
		expect(recording.getSnapshot()).toEqual({
			status: "recording",
			bufferedCount: 0,
		});

		const flushResult = await recording.flush();
		expect(flushResult.flushedEvents).toHaveLength(0);
	});

	test("calls processBufferedCapture on flush with buffered events", async () => {
		const processFn = vi.fn();
		const recording = createRecordingStateMachine("paused");
		recording.setProcessBufferedCapture(processFn);

		recording.ingestCapture(createCapture(1));
		recording.ingestCapture(createCapture(2));
		expect(recording.getSnapshot().bufferedCount).toBe(2);

		expect(recording.resume()).toEqual({
			status: "recording",
			bufferedCount: 2,
		});

		const flushResult = await recording.flush();
		expect(processFn).toHaveBeenCalledTimes(1);
		expect(processFn).toHaveBeenCalledWith([
			createCapture(1),
			createCapture(2),
		]);
		expect(flushResult.flushedEvents).toHaveLength(2);
		expect(flushResult.snapshot.bufferedCount).toBe(0);
	});

	test("does not call processBufferedCapture on flush when not set", async () => {
		const recording = createRecordingStateMachine("paused");
		recording.ingestCapture(createCapture(1));
		expect(recording.getSnapshot().bufferedCount).toBe(1);

		recording.resume();
		const flushResult = await recording.flush();
		expect(flushResult.flushedEvents).toHaveLength(1);
	});

	test("ingestCapture does not buffer when recording", () => {
		const recording = createRecordingStateMachine("recording");
		recording.ingestCapture(createCapture(1));
		expect(recording.getSnapshot().bufferedCount).toBe(0);
	});
});
