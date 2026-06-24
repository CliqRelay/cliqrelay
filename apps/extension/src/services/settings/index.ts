import { browser } from "wxt/browser";

import { getSettingsFactory, updateSettingsFactory } from "./settings.service";

export const getSettings = getSettingsFactory(browser.storage.local);
export const updateSettings = updateSettingsFactory(
	browser.storage.local,
	getSettings,
);

export type { GetSettings, UpdateSettings } from "./settings.service";
