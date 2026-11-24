import { browser } from "wxt/browser";

const LEGACY_ACTIVE_GUIDE_KEY = "activeGuideId";
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

export const createLegacyCleanup =
  (local: RemovableStorage | undefined, session: RemovableStorage | undefined) =>
  async (): Promise<void> => {
    await Promise.all([
      removeKey(local, LEGACY_ACTIVE_GUIDE_KEY),
      removeKey(session, LEGACY_OFFSCREEN_SESSION_KEY),
    ]);
  };

export const runLegacyCleanup = createLegacyCleanup(browser.storage.local, browser.storage.session);
