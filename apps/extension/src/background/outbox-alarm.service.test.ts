import { afterEach, describe, expect, test, vi } from "vitest";

import type { BootGate } from "./boot-gate.service";
import { createOutboxAlarmListener } from "./outbox-alarm.service";

type AlarmListenerDeps = Parameters<typeof createOutboxAlarmListener>[0];
type RunWhenReady = Pick<BootGate, "run">["run"];

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("outbox alarm listener", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("waits for the boot gate before handling the alarm", async () => {
    const ready = deferred();
    const gate: Pick<BootGate, "run"> = {
      run: vi.fn<RunWhenReady>().mockImplementation((task) => ready.promise.then(task)),
    };
    const handleAlarm = vi.fn<AlarmListenerDeps["handleAlarm"]>().mockResolvedValue(undefined);
    const listener = createOutboxAlarmListener({ gate, handleAlarm });

    listener({ name: "cliqrelay.outbox-drain" });

    expect(gate.run).toHaveBeenCalledTimes(1);
    expect(handleAlarm).not.toHaveBeenCalled();

    ready.resolve();
    await vi.waitFor(() => expect(handleAlarm).toHaveBeenCalledTimes(1));
    expect(handleAlarm).toHaveBeenCalledWith({ name: "cliqrelay.outbox-drain" });
  });

  test("catches a rejected alarm handler and logs it", async () => {
    const gate: Pick<BootGate, "run"> = {
      run: vi.fn<RunWhenReady>().mockImplementation((task) => Promise.resolve().then(task)),
    };
    const error = new Error("drain failed");
    const handleAlarm = vi.fn<AlarmListenerDeps["handleAlarm"]>().mockRejectedValue(error);
    const log = vi.fn<NonNullable<AlarmListenerDeps["log"]>>();
    const listener = createOutboxAlarmListener({ gate, handleAlarm, log });

    expect(() => listener({ name: "cliqrelay.outbox-maintenance" })).not.toThrow();
    await vi.waitFor(() => expect(log).toHaveBeenCalledTimes(1));
    expect(log).toHaveBeenCalledWith("[background] Outbox alarm failed:", error);
  });

  test("catches a boot gate rejection without handling the alarm", async () => {
    const error = new Error("boot failed");
    const gate: Pick<BootGate, "run"> = {
      run: vi.fn<RunWhenReady>().mockRejectedValue(error),
    };
    const handleAlarm = vi.fn<AlarmListenerDeps["handleAlarm"]>().mockResolvedValue(undefined);
    const log = vi.fn<NonNullable<AlarmListenerDeps["log"]>>();
    const listener = createOutboxAlarmListener({ gate, handleAlarm, log });

    listener({ name: "cliqrelay.outbox-drain" });

    await vi.waitFor(() =>
      expect(log).toHaveBeenCalledWith("[background] Outbox alarm failed:", error),
    );
    expect(handleAlarm).not.toHaveBeenCalled();
  });
});
