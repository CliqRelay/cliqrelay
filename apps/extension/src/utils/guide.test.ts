import { afterEach, describe, expect, test, vi } from "vitest";

import { createGuideTitle } from "./guide";

describe("GuideTitle", () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe("createGuideTitle", () => {
		test("should return a guide-prefixed epoch timestamp when called", () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-08-17T14:30:22.000Z"));

			const title = createGuideTitle();

			expect(title).toMatch(/^guide-\d+$/);
			expect(title).toBe(
				`guide-${new Date("2026-08-17T14:30:22.000Z").getTime()}`,
			);
		});

		test("should return different titles when the clock advances", () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-08-17T14:30:22.000Z"));
			const first = createGuideTitle();

			vi.setSystemTime(new Date("2026-08-17T14:30:23.000Z"));
			const second = createGuideTitle();

			expect(first).not.toBe(second);
		});
	});
});
