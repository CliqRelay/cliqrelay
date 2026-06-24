import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatGuideDuration, formatGuideCreationTime } from "./guide.utils";

describe("Guide Utils", () => {
	describe("formatGuideDuration", () => {
		it("returns '0ms' for 0 seconds", () => {
			expect(formatGuideDuration(0)).toBe("0ms");
		});

		it("returns seconds for values between 1 and 59", () => {
			expect(formatGuideDuration(5)).toBe("5s");
			expect(formatGuideDuration(30)).toBe("30s");
			expect(formatGuideDuration(59)).toBe("59s");
		});

		it("returns minutes for exact minute values", () => {
			expect(formatGuideDuration(60)).toBe("1m");
			expect(formatGuideDuration(120)).toBe("2m");
		});

		it("returns minutes for non-exact minute values (rounded)", () => {
			expect(formatGuideDuration(90)).toBe("2m");
			expect(formatGuideDuration(150)).toBe("3m");
			expect(formatGuideDuration(61)).toBe("1m");
		});
	});

	describe("formatGuideCreationTime", () => {
		const NOW = 1705310400000;

		beforeEach(() => {
			vi.spyOn(Date, "now").mockReturnValue(NOW);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("returns '0ms' for the current moment", () => {
			const date = new Date(NOW).toISOString();
			expect(formatGuideCreationTime(date)).toBe("0ms");
		});

		it("returns seconds for a few seconds ago", () => {
			const date = new Date(NOW - 5000).toISOString();
			expect(formatGuideCreationTime(date)).toBe("5s");
		});

		it("returns minutes for a few minutes ago", () => {
			const date = new Date(NOW - 120000).toISOString();
			expect(formatGuideCreationTime(date)).toBe("2m");
		});

		it("returns hours for an hour ago", () => {
			const date = new Date(NOW - 3600000).toISOString();
			expect(formatGuideCreationTime(date)).toBe("1h");
		});

		it("returns hours for multiple hours ago", () => {
			const date = new Date(NOW - 7200000).toISOString();
			expect(formatGuideCreationTime(date)).toBe("2h");
		});

		it("returns days for multiple days ago", () => {
			const date = new Date(NOW - 86400000 * 3).toISOString();
			expect(formatGuideCreationTime(date)).toBe("3d");
		});

		it("returns days for a week ago", () => {
			const date = new Date(NOW - 86400000 * 7).toISOString();
			expect(formatGuideCreationTime(date)).toBe("7d");
		});
	});
});
