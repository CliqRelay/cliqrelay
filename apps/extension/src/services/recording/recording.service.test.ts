import { describe, expect, test, vi } from "vitest";

import { createRecordingStateMachine } from "./recording.service";

describe("recording state machine", () => {
  test("tracks start, pause, resume, and stop transitions", () => {
    const recording = createRecordingStateMachine("idle");

    expect(recording.getSnapshot()).toEqual({ status: "idle" });
    expect(recording.start()).toEqual({ status: "recording" });
    expect(recording.pause()).toEqual({ status: "paused" });
    expect(recording.resume()).toEqual({ status: "recording" });
    expect(recording.stop()).toEqual({ status: "stopped" });
  });

  test("restores a persisted status without notifying listeners", () => {
    const onStatusChange = vi.fn();
    const machine = createRecordingStateMachine("idle", onStatusChange);

    expect(machine.restore("paused")).toEqual({ status: "paused" });
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  test("notifies onStatusChange only when the status changes", () => {
    const onStatusChange = vi.fn();
    const machine = createRecordingStateMachine("idle", onStatusChange);

    machine.start();
    machine.resume();
    machine.pause();
    machine.stop();

    expect(onStatusChange.mock.calls).toEqual([["recording"], ["paused"], ["stopped"]]);
  });
});
