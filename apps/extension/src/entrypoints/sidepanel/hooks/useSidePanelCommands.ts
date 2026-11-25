import { browser } from "wxt/browser";

import {
  type ExtensionSettings,
  extensionSettingsSchema,
  type SidePanelCommand,
  sidePanelCommandSchema,
  sidePanelCommandType,
} from "@/models";

const sendCommand = async (command: SidePanelCommand): Promise<unknown> => {
  try {
    return await browser.runtime.sendMessage(sidePanelCommandSchema.parse(command));
  } catch (error) {
    console.error("[sidepanel] Failed to send command:", error);
    return undefined;
  }
};

const getSettings = async (): Promise<ExtensionSettings | undefined> => {
  const response = await sendCommand({
    type: sidePanelCommandType,
    command: "get_settings",
  });
  const parsed = extensionSettingsSchema.safeParse(response);

  return parsed.success ? parsed.data : undefined;
};

export const sidePanelCommands = {
  startRecording: () => sendCommand({ type: sidePanelCommandType, command: "start_recording" }),
  pauseRecording: () => sendCommand({ type: sidePanelCommandType, command: "pause_recording" }),
  resumeRecording: () => sendCommand({ type: sidePanelCommandType, command: "resume_recording" }),
  stopRecording: () => sendCommand({ type: sidePanelCommandType, command: "stop_recording" }),
  cancelRecording: () => sendCommand({ type: sidePanelCommandType, command: "cancel_recording" }),
  dismissStep: (stepId: string) =>
    sendCommand({
      type: sidePanelCommandType,
      command: "dismiss_step",
      stepId,
    }),
  deleteStep: (stepId: string) =>
    sendCommand({
      type: sidePanelCommandType,
      command: "delete_step",
      stepId,
    }),
  deleteGuide: (guideId: string) =>
    sendCommand({
      type: sidePanelCommandType,
      command: "delete_guide",
      guideId,
    }),
  retryFailed: (sessionId?: string) =>
    sendCommand({
      type: sidePanelCommandType,
      command: "retry_failed",
      ...(sessionId ? { sessionId } : {}),
    }),
  discardSession: (sessionId: string) =>
    sendCommand({
      type: sidePanelCommandType,
      command: "discard_session",
      sessionId,
    }),
  discardUserData: () =>
    sendCommand({
      type: sidePanelCommandType,
      command: "discard_user_data",
    }),
  getSettings,
  updateSettings: (payload: Partial<ExtensionSettings>) =>
    sendCommand({
      type: sidePanelCommandType,
      command: "update_settings",
      payload,
    }),
} as const;

export const useSidePanelCommands = () => sidePanelCommands;
