import type { BrowserStorage, ExtensionSettings } from "@/models";
import { defaultExtensionSettings } from "@/models";
import { STORAGE_KEY_SETTINGS } from "@/utils/constants";

const settingsStorageKey = STORAGE_KEY_SETTINGS;

export const getSettingsFactory = (storage: BrowserStorage) => {
	return async (): Promise<ExtensionSettings> => {
		const result = await storage.get([settingsStorageKey]);
		const stored = result[settingsStorageKey] as
			| Partial<ExtensionSettings>
			| undefined;
		return { ...defaultExtensionSettings, ...stored };
	};
};

export type GetSettings = ReturnType<typeof getSettingsFactory>;

export const updateSettingsFactory = (
	storage: BrowserStorage,
	getSettings: GetSettings,
) => {
	return async (
		updates: Partial<ExtensionSettings>,
	): Promise<ExtensionSettings> => {
		const current = await getSettings();
		const merged: ExtensionSettings = { ...current, ...updates };
		await storage.set({ [settingsStorageKey]: merged });
		return merged;
	};
};

export type UpdateSettings = ReturnType<typeof updateSettingsFactory>;
