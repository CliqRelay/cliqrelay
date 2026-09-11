import { describe, expect, test } from "vitest";

import { getStepActionText } from "./action-text";

describe("getStepActionText", () => {
	test("should prefer the persisted action text", () => {
		expect(getStepActionText('Click "Save"', "click", "https://a.test")).toBe(
			'Click "Save"',
		);
	});

	test("should fall back to a readable action and url", () => {
		expect(getStepActionText(null, "navigation", "https://a.test")).toBe(
			'Navigate to "https://a.test"',
		);
	});

	test("should use Capture for unknown actions", () => {
		expect(getStepActionText(undefined, null, "https://a.test")).toBe(
			'Capture "https://a.test"',
		);
	});

	test("should use unknown when the url is missing", () => {
		expect(getStepActionText(undefined, "click", null)).toBe(
			'Click "unknown"',
		);
	});
});
