import { describe, expect, test, vi } from "vitest";

import { createDroppedCaptureReporter } from "./diagnostics";

describe("dropped capture reporter", () => {
  test("logs every drop in developer builds", () => {
    const log = vi.fn();
    const report = createDroppedCaptureReporter({ isDev: true, log });

    report("status=idle");
    report("status=idle");

    expect(log).toHaveBeenCalledTimes(2);
  });

  test("warns at most once per interval in production", () => {
    let now = 1_000;
    const log = vi.fn();
    const report = createDroppedCaptureReporter({ isDev: false, now: () => now, log });

    report("status=idle");
    now += 5_000;
    report("status=idle");
    report("status=paused");

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[background] Dropped capture: status=idle");
  });

  test("warns again once the interval has elapsed", () => {
    let now = 1_000;
    const log = vi.fn();
    const report = createDroppedCaptureReporter({
      isDev: false,
      intervalMs: 60_000,
      now: () => now,
      log,
    });

    report("first");
    now += 60_000;
    report("second");

    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls).toEqual([
      ["[background] Dropped capture: first"],
      ["[background] Dropped capture: second"],
    ]);
  });
});
