import {
  type CaptureBridgeMessage,
  type SidePanelCommand,
  validateCaptureBridgeMessage,
  validateSidePanelCommand,
} from "@/models";

export const isCaptureBridgeMessage = (message: unknown): message is CaptureBridgeMessage => {
  return (
    validateCaptureBridgeMessage(message).success &&
    (message as CaptureBridgeMessage).source === "content-script"
  );
};

export const isSidePanelCommand = (message: unknown): message is SidePanelCommand => {
  return validateSidePanelCommand(message).success;
};

export const isMessageOfType = (message: unknown, type: string): boolean =>
  typeof message === "object" && message !== null && "type" in message && message.type === type;
