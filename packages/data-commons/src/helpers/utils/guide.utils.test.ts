import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	formatCompactNumber,
	formatGuideCreationTime,
	formatGuideDuration,
} from "./guide.utils";

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

	describe("formatCompactNumber", () => {
		it("returns '0' for 0", () => {
			expect(formatCompactNumber(0)).toBe("0");
		});

		it("returns the number as string when below 1000", () => {
			expect(formatCompactNumber(1)).toBe("1");
			expect(formatCompactNumber(500)).toBe("500");
			expect(formatCompactNumber(999)).toBe("999");
		});

		it("formats thousands with 'k' suffix", () => {
			expect(formatCompactNumber(1000)).toBe("1k");
			expect(formatCompactNumber(1500)).toBe("1.5k");
			expect(formatCompactNumber(10000)).toBe("10k");
			expect(formatCompactNumber(15000)).toBe("15k");
			expect(formatCompactNumber(100000)).toBe("100k");
			expect(formatCompactNumber(999000)).toBe("999k");
		});

		it("formats millions with 'M' suffix", () => {
			expect(formatCompactNumber(1_000_000)).toBe("1M");
			expect(formatCompactNumber(1_500_000)).toBe("1.5M");
			expect(formatCompactNumber(10_000_000)).toBe("10M");
			expect(formatCompactNumber(100_000_000)).toBe("100M");
			expect(formatCompactNumber(999_000_000)).toBe("999M");
		});

		it("formats billions with 'B' suffix", () => {
			expect(formatCompactNumber(1_000_000_000)).toBe("1B");
			expect(formatCompactNumber(1_500_000_000)).toBe("1.5B");
			expect(formatCompactNumber(10_000_000_000)).toBe("10B");
		});

		it("handles negative numbers", () => {
			expect(formatCompactNumber(-1)).toBe("-1");
			expect(formatCompactNumber(-1000)).toBe("-1k");
			expect(formatCompactNumber(-1500)).toBe("-1.5k");
			expect(formatCompactNumber(-1_000_000)).toBe("-1M");
		});

		it("rounds to one decimal below 10, no decimal at 10+", () => {
			expect(formatCompactNumber(1100)).toBe("1.1k");
			expect(formatCompactNumber(1900)).toBe("1.9k");
			expect(formatCompactNumber(10100)).toBe("10k");
			expect(formatCompactNumber(10900)).toBe("11k");
		});

		it("handles exact boundaries", () => {
			expect(formatCompactNumber(999_999)).toBe("1000k");
			expect(formatCompactNumber(1_000_000)).toBe("1M");
			expect(formatCompactNumber(999_999_999)).toBe("1000M");
			expect(formatCompactNumber(1_000_000_000)).toBe("1B");
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
