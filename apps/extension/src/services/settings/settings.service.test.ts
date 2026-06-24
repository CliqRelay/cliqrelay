import { describe, expect, test, vi } from "vitest";

import { defaultExtensionSettings } from "@/models";
import { getSettingsFactory, updateSettingsFactory } from "./settings.service";

describe("settings service", () => {
	test("returns default settings when nothing is stored", async () => {
		const storage = {
			get: vi.fn().mockResolvedValue({}),
			set: vi.fn().mockResolvedValue(undefined),
		};

		const getSettings = getSettingsFactory(storage);
		const settings = await getSettings();

		expect(settings).toEqual(defaultExtensionSettings);
	});

	test("merges stored settings with defaults", async () => {
		const storage = {
			get: vi.fn().mockResolvedValue({
				"cliqrelay.extension-settings": {
					capturePreferences: {
						captureClicks: true,
						captureInput: false,
					},
				},
			}),
			set: vi.fn().mockResolvedValue(undefined),
		};

		const getSettings = getSettingsFactory(storage);
		const settings = await getSettings();

		expect(settings.capturePreferences.captureClicks).toBe(true);
		expect(settings.maskingRules.enabled).toBe(true);
	});

	test("updates and persists settings", async () => {
		const storage = {
			get: vi.fn().mockResolvedValue({
				"cliqrelay.extension-settings": {
					maskingRules: {
						selectors: [".old-selector"],
						enabled: false,
					},
				},
			}),
			set: vi.fn().mockResolvedValue(undefined),
		};

		const getSettings = getSettingsFactory(storage);
		const updateSettings = updateSettingsFactory(storage, getSettings);
		const updated = await updateSettings({
			maskingRules: {
				selectors: [".new-selector"],
				enabled: true,
			},
		});

		expect(updated.maskingRules.selectors).toEqual([".new-selector"]);
		expect(updated.maskingRules.enabled).toBe(true);
		expect(storage.set).toHaveBeenCalledWith({
			"cliqrelay.extension-settings": updated,
		});
	});
});
