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

  test("prefers stored settings over defaults", async () => {
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
    expect(settings.capturePreferences.captureInput).toBe(false);
  });

  test("updates and persists settings", async () => {
    const storage = {
      get: vi.fn().mockResolvedValue({
        "cliqrelay.extension-settings": {
          capturePreferences: {
            captureClicks: false,
            captureInput: false,
          },
        },
      }),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const getSettings = getSettingsFactory(storage);
    const updateSettings = updateSettingsFactory(storage, getSettings);
    const updated = await updateSettings({
      capturePreferences: {
        captureClicks: true,
        captureInput: false,
      },
    });

    expect(updated.capturePreferences.captureClicks).toBe(true);
    expect(updated.capturePreferences.captureInput).toBe(false);
    expect(storage.set).toHaveBeenCalledWith({
      "cliqrelay.extension-settings": updated,
    });
  });
});
