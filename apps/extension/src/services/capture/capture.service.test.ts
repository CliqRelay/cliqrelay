// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";

import { getSelector } from "@/utils/dom";
import {
	buildCaptureEventPayload,
	createCaptureService,
} from "./capture.service";

describe("capture service", () => {
	test("builds a click payload with selector, bounding box, and cursor data", () => {
		document.body.innerHTML = `
			<button data-testid="settings">Settings</button>
		`;

		const button = document.querySelector("button") as HTMLButtonElement;
		button.getBoundingClientRect = vi.fn(
			() =>
				({
					x: 12,
					y: 24,
					width: 320,
					height: 48,
					left: 12,
					top: 24,
					right: 332,
					bottom: 72,
					toJSON: () => ({}),
				}) as DOMRect,
		);

		const event = new MouseEvent("click", {
			clientX: 120,
			clientY: 240,
			bubbles: true,
		});
		Object.defineProperty(event, "target", { value: button });

		// Mock window.innerWidth/innerHeight for the viewport coords
		const origInnerWidth = window.innerWidth;
		const origInnerHeight = window.innerHeight;
		Object.defineProperty(window, "innerWidth", { value: 1920, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: 1080, configurable: true });

		const payload = buildCaptureEventPayload(
			event,
			"https://example.com/settings",
			"2026-06-01T12:00:00.000Z",
		);

		expect(payload).toEqual({
			action: "click",
			url: "https://example.com/settings",
			capturedAt: "2026-06-01T12:00:00.000Z",
			targetElement: {
				selector: 'button[data-testid="settings"]',
				boundingBox: {
					x: 12,
					y: 24,
					width: 320,
					height: 48,
				},
				innerText: "Settings",
				tagName: "BUTTON",
				elementType: undefined,
				ariaLabel: undefined,
				placeholder: undefined,
				name: undefined,
				role: undefined,
				labelText: undefined,
				alt: undefined,
				checked: undefined,
				value: undefined,
				url: "https://example.com/settings",
				clickX: 120,
				clickY: 240,
				viewportWidth: 1920,
				viewportHeight: 1080,
				elementTag: "button",
			},
		});

		// Restore
		Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: origInnerHeight, configurable: true });
	});

	test("classifies input, select, and submit events", () => {
		document.body.innerHTML = `
			<form>
				<input name="email" value="test@example.com" />
				<select name="plan"><option value="pro">Pro</option></select>
			</form>
		`;

		const input = document.querySelector("input") as HTMLInputElement;
		const select = document.querySelector("select") as HTMLSelectElement;
		const form = document.querySelector("form") as HTMLFormElement;

		const inputEvent = new Event("blur", { bubbles: true });
		Object.defineProperty(inputEvent, "target", { value: input });
		expect(
			buildCaptureEventPayload(
				inputEvent,
				"https://example.com/form",
				"2026-06-01T12:00:00.000Z",
			)?.action,
		).toBe("input");

		const selectEvent = new Event("change", { bubbles: true });
		Object.defineProperty(selectEvent, "target", { value: select });
		expect(
			buildCaptureEventPayload(
				selectEvent,
				"https://example.com/form",
				"2026-06-01T12:00:00.000Z",
			)?.action,
		).toBe("input");

		const submitEvent = new Event("submit", {
			bubbles: true,
			cancelable: true,
		});
		Object.defineProperty(submitEvent, "target", { value: form });
		expect(
			buildCaptureEventPayload(
				submitEvent,
				"https://example.com/form",
				"2026-06-01T12:00:00.000Z",
			)?.action,
		).toBeUndefined();
	});

	test("ignores unsupported events", () => {
		expect(
			buildCaptureEventPayload(
				new Event("keydown"),
				"https://example.com",
				"2026-06-01T12:00:00.000Z",
			),
		).toBeNull();
	});

	test("extracts selectors from ids and names", () => {
		document.body.innerHTML = `
			<input id="email" name="email" />
		`;

		const input = document.querySelector("input") as HTMLInputElement;
		expect(getSelector(input)).toBe('input[id="email"]');
	});

	test("sanitizes selector attributes and normalizes inner text", () => {
		document.body.innerHTML = `
			<button data-testid='path\\to "settings"'>
				Open
				Settings
			</button>
		`;

		const button = document.querySelector("button") as HTMLButtonElement;
		expect(getSelector(button)).toBe(
			'button[data-testid="path\\\\to \\"settings\\""]',
		);

		const event = new MouseEvent("click", {
			clientX: 10,
			clientY: 20,
			bubbles: true,
		});
		Object.defineProperty(event, "target", { value: button });

		const payload = buildCaptureEventPayload(
			event,
			"https://example.com/settings",
			"2026-06-01T12:00:00.000Z",
		);

		expect(payload?.targetElement?.innerText).toBe("Open Settings");
	});

	test("installs and removes capture listeners", () => {
		const sink = vi.fn();
		const captureService = createCaptureService(sink);
		const stop = captureService.start(document);

		document.body.innerHTML = `<button data-testid="save">Save</button>`;
		const button = document.querySelector("button") as HTMLButtonElement;
		Object.defineProperty(button, "getBoundingClientRect", {
			value: () =>
				({
					x: 0,
					y: 0,
					width: 10,
					height: 10,
					left: 0,
					top: 0,
					right: 10,
					bottom: 10,
					toJSON: () => ({}),
				}) as DOMRect,
		});

		button.dispatchEvent(
			new MouseEvent("click", {
				bubbles: true,
				clientX: 1,
				clientY: 2,
			}),
		);

		expect(sink).toHaveBeenCalledTimes(1);
		stop();
	});
});
