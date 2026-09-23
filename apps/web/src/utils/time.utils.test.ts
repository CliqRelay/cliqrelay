import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { timeAgo } from "./time.utils";

const NOW = new Date("2026-09-24T12:00:00Z");
const ago = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.each([
    ["an instant ago", ago(0), "just now"],
    ["under a second ago", ago(400), "just now"],
    ["slightly in the future from clock skew", ago(-2_000), "just now"],
    ["just under the threshold", ago(4_999), "just now"],
    ["at the threshold", ago(5_000), "5s ago"],
    ["minutes ago", ago(2 * 60_000), "2m ago"],
    ["hours ago", ago(3 * 3_600_000), "3h ago"],
  ])("formats %s", (_, date, expected) => {
    expect(timeAgo(date)).toBe(expected);
  });
});
