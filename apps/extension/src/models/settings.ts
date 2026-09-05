import { z } from "zod";

import { getValidationResult } from "./validation";

export const extensionSettingsSchema = z.object({
  capturePreferences: z.object({
    captureClicks: z.boolean(),
    captureInput: z.boolean(),
  }),
});
export type ExtensionSettings = z.infer<typeof extensionSettingsSchema>;

export const defaultExtensionSettings: ExtensionSettings = {
  capturePreferences: {
    captureClicks: true,
    captureInput: true,
  },
};

export const validateExtensionSettings = (data: unknown) =>
  getValidationResult(data, extensionSettingsSchema);
