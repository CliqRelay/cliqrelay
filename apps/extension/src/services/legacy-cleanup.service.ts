import { browser } from "wxt/browser";

import { STORAGE_KEY_ACTIVE_GUIDE } from "@/utils/constants";

const LEGACY_OFFSCREEN_SESSION_KEY = "offscreen_session";

type RemovableStorage = {
  remove: (keys: string | string[]) => Promise<void>;
};

const removeKey = async (storage: RemovableStorage | undefined, key: string): Promise<void> => {
  try {
    await storage?.remove(key);
  } catch {
    // Legacy keys are inert; a failed removal must not block boot.
  }
};

/**
 * Removes state written by the offscreen upload pipeline. Runs once at boot and
 * is safe to repeat: the keys are simply absent after the first pass.
 */
export const createLegacyCleanup =
  (local: RemovableStorage | undefined, session: RemovableStorage | undefined) =>
  async (): Promise<void> => {
    await Promise.all([
      removeKey(local, STORAGE_KEY_ACTIVE_GUIDE),
      removeKey(session, LEGACY_OFFSCREEN_SESSION_KEY),
    ]);
  };

export const runLegacyCleanup = createLegacyCleanup(browser.storage.local, browser.storage.session);
