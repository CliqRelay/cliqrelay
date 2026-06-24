import type { BrowserStorage, SessionService } from "@/models";
import { STORAGE_KEY_ACTIVE_GUIDE } from "@/utils/constants";

const activeGuideStorageKey = STORAGE_KEY_ACTIVE_GUIDE;

export const createSessionService = (storage: BrowserStorage) => {
	const getActiveGuideId = async (): Promise<string | undefined> => {
		try {
			const result = await storage.get([activeGuideStorageKey]);
			return result[activeGuideStorageKey] as string | undefined;
		} catch {
			return undefined;
		}
	};

	const setActiveGuideId = async (id: string | null): Promise<void> => {
		await storage.set({ [activeGuideStorageKey]: id });
	};

	return { getActiveGuideId, setActiveGuideId };
};

export type { SessionService };
