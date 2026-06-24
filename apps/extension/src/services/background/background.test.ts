import { describe, expect, test } from "vitest";

import { type SidePanelCommand, sidePanelCommandType } from "@/models";
import { generateCaptureId } from "@/utils/id";
import { isCaptureBridgeMessage, isSidePanelCommand } from "@/utils/message";
import { CliqRelayEvents } from "@repo/data-commons";

describe("isSidePanelCommand", () => {
	test("identifies valid side panel commands", () => {
		const command: SidePanelCommand = {
			type: sidePanelCommandType,
			command: "start_recording",
		};
		expect(isSidePanelCommand(command)).toBe(true);
	});

	test("rejects messages without sidePanelCommandType", () => {
		expect(
			isSidePanelCommand({ type: "other", command: "start_recording" }),
		).toBe(false);
	});

	test("rejects messages without command field", () => {
		expect(isSidePanelCommand({ type: sidePanelCommandType })).toBe(false);
	});

	test("rejects non-object messages", () => {
		expect(isSidePanelCommand(null)).toBe(false);
		expect(isSidePanelCommand("string")).toBe(false);
		expect(isSidePanelCommand(42)).toBe(false);
	});
});

describe("isCaptureBridgeMessage", () => {
	test("identifies valid capture bridge messages", () => {
		const message = {
			source: "content-script" as const,
			type: CliqRelayEvents.CAPTURE_EVENT,
			payload: {
				action: "click" as const,
				url: "https://example.com",
				capturedAt: "2026-06-01T12:00:00.000Z",
			},
		};
		expect(isCaptureBridgeMessage(message)).toBe(true);
	});

	test("rejects messages from background source", () => {
		const message = {
			source: "background" as const,
			type: CliqRelayEvents.CAPTURE_EVENT,
			payload: {
				action: "click" as const,
				url: "https://example.com",
				capturedAt: "2026-06-01T12:00:00.000Z",
			},
		};
		expect(isCaptureBridgeMessage(message)).toBe(false);
	});

	test("rejects messages without captureBridgeMessageType", () => {
		expect(
			isCaptureBridgeMessage({ source: "content-script", type: "other" }),
		).toBe(false);
	});

	test("rejects non-object messages", () => {
		expect(isCaptureBridgeMessage(null)).toBe(false);
		expect(isCaptureBridgeMessage("string")).toBe(false);
	});
});

describe("generateCaptureId", () => {
	test("returns a string starting with capture_", () => {
		expect(generateCaptureId()).toMatch(/^capture_\d+_[a-z0-9]+$/);
	});

	test("generates unique values", () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateCaptureId()));
		expect(ids.size).toBe(100);
	});
});
