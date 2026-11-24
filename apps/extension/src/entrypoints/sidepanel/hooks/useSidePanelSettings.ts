import { useEffect } from "react";

import { useSidePanelStore } from "../stores/sidepanel-store";
import { sidePanelCommands } from "./useSidePanelCommands";

export const useSidePanelSettings = () => {
  const settings = useSidePanelStore((state) => state.settings);
  const setSettings = useSidePanelStore((state) => state.setSettings);

  useEffect(() => {
    let isDisposed = false;

    void sidePanelCommands.getSettings().then((next) => {
      if (!isDisposed && next) {
        setSettings(next);
      }
    });

    return () => {
      isDisposed = true;
    };
  }, [setSettings]);

  return { settings, updateSettings: sidePanelCommands.updateSettings };
};
