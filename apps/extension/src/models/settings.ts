import { z } from "zod";

import { getValidationResult } from "./validation";

export const extensionSettingsSchema = z.object({
	maskingRules: z.object({
		selectors: z.array(z.string()),
		enabled: z.boolean(),
	}),
	capturePreferences: z.object({
		captureClicks: z.boolean(),
		captureInput: z.boolean(),
	}),
});
export type ExtensionSettings = z.infer<typeof extensionSettingsSchema>;

export const defaultExtensionSettings: ExtensionSettings = {
	maskingRules: {
		selectors: [],
		enabled: true,
	},
	capturePreferences: {
		captureClicks: true,
		captureInput: true,
	},
};

export const validateExtensionSettings = (data: unknown) =>
	getValidationResult(data, extensionSettingsSchema);
