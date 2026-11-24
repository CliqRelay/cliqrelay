import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendMessage: vi.fn() }));

vi.mock("wxt/browser", () => ({
  browser: { runtime: { sendMessage: mocks.sendMessage } },
}));

import { sidePanelCommands } from "./useSidePanelCommands";
import { sidePanelCommandType } from "@/models";

describe("sidePanelCommands", () => {
  beforeEach(() => {
    mocks.sendMessage.mockReset();
    mocks.sendMessage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("sends recording commands as runtime messages", async () => {
    await sidePanelCommands.startRecording();
    await sidePanelCommands.pauseRecording();
    await sidePanelCommands.resumeRecording();
    await sidePanelCommands.stopRecording();

    expect(mocks.sendMessage.mock.calls.map(([message]) => message)).toEqual([
      { type: sidePanelCommandType, command: "start_recording" },
      { type: sidePanelCommandType, command: "pause_recording" },
      { type: sidePanelCommandType, command: "resume_recording" },
      { type: sidePanelCommandType, command: "stop_recording" },
    ]);
  });

  test("sends local-sync commands with their targets", async () => {
    await sidePanelCommands.dismissStep("step-1");
    await sidePanelCommands.retryFailed("session-1");
    await sidePanelCommands.retryFailed();
    await sidePanelCommands.discardSession("session-1");
    await sidePanelCommands.discardUserData();

    expect(mocks.sendMessage.mock.calls.map(([message]) => message)).toEqual([
      { type: sidePanelCommandType, command: "dismiss_step", stepId: "step-1" },
      { type: sidePanelCommandType, command: "retry_failed", sessionId: "session-1" },
      { type: sidePanelCommandType, command: "retry_failed" },
      { type: sidePanelCommandType, command: "discard_session", sessionId: "session-1" },
      { type: sidePanelCommandType, command: "discard_user_data" },
    ]);
  });

  test("fetches and validates settings", async () => {
    const settings = {
      capturePreferences: { captureClicks: false, captureInput: true },
    };
    mocks.sendMessage.mockResolvedValue(settings);

    await expect(sidePanelCommands.getSettings()).resolves.toEqual(settings);
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: sidePanelCommandType,
      command: "get_settings",
    });
  });

  test("returns undefined for an invalid settings response", async () => {
    mocks.sendMessage.mockResolvedValue({ nope: true });

    await expect(sidePanelCommands.getSettings()).resolves.toBeUndefined();
  });

  test("sends settings updates", async () => {
    const payload = {
      capturePreferences: { captureClicks: true, captureInput: false },
    };

    await sidePanelCommands.updateSettings(payload);

    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: sidePanelCommandType,
      command: "update_settings",
      payload,
    });
  });

  test("swallows a missing background receiver", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.sendMessage.mockRejectedValue(new Error("Could not establish connection"));

    await expect(sidePanelCommands.stopRecording()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
