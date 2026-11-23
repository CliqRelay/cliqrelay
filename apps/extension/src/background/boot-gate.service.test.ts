import { describe, expect, test, vi } from "vitest";

import { createBootGate } from "./boot-gate.service";

const deferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

describe("boot gate", () => {
  test("does not run work until hydration completes", async () => {
    const hydration = deferred();
    const gate = createBootGate(hydration.promise);
    const task = vi.fn().mockResolvedValue("state");

    const result = gate.run(task);

    await Promise.resolve();
    expect(task).not.toHaveBeenCalled();

    hydration.resolve();
    await expect(result).resolves.toBe("state");
  });

  test("keeps serving after a failed hydration", async () => {
    const gate = createBootGate(Promise.reject(new Error("storage unavailable")));

    await expect(gate.ready).resolves.toBeUndefined();
    await expect(gate.run(() => "state")).resolves.toBe("state");
  });
});
