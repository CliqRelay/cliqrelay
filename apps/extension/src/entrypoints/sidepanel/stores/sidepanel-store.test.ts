import { describe, expect, test } from "vitest";

import { useSidePanelStore } from "./sidepanel-store";
import { defaultExtensionSettings } from "@/models";

describe("sidepanel store", () => {
  test("starts without settings", () => {
    expect(useSidePanelStore.getState().settings).toBeUndefined();
  });

  test("setSettings stores the fetched settings", () => {
    useSidePanelStore.getState().setSettings(defaultExtensionSettings);

    expect(useSidePanelStore.getState().settings).toEqual(defaultExtensionSettings);
  });
});
