// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { defaultExtensionSettings } from "@/models";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("./useSidePanelCommands", () => ({
  sidePanelCommands: {
    getSettings: mocks.getSettings,
    updateSettings: mocks.updateSettings,
  },
}));

import { useSidePanelStore } from "../stores/sidepanel-store";
import { useSidePanelSettings } from "./useSidePanelSettings";

describe("useSidePanelSettings", () => {
  beforeEach(() => {
    mocks.getSettings.mockReset();
    mocks.updateSettings.mockReset();
    useSidePanelStore.setState({ settings: undefined });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("hydrates settings from the background on mount", async () => {
    mocks.getSettings.mockResolvedValue(defaultExtensionSettings);

    const { result } = renderHook(() => useSidePanelSettings());

    await waitFor(() => expect(result.current.settings).toEqual(defaultExtensionSettings));
    expect(mocks.getSettings).toHaveBeenCalledTimes(1);
  });

  test("delegates updates to the command helper", async () => {
    mocks.getSettings.mockResolvedValue(defaultExtensionSettings);
    mocks.updateSettings.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSidePanelSettings());
    await waitFor(() => expect(result.current.settings).toBeDefined());

    const payload = {
      capturePreferences: { captureClicks: false, captureInput: true },
    };
    await result.current.updateSettings(payload);

    expect(mocks.updateSettings).toHaveBeenCalledWith(payload);
  });
});
