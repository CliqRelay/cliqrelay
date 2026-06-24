import { api } from "@repo/api-client";

import { withCsrf } from "@/lib/csrf";

export const createEnsureGuide = (
	getActiveGuideId: () => Promise<string | undefined>,
	setActiveGuideId: (id: string | null) => Promise<void>,
) => {
	return async (): Promise<{ guideId: string; isNew: boolean }> => {
		let guideId = await getActiveGuideId();

		if (!guideId) {
			const response = await api.guides.createGuide(
				{ title: "Untitled Guide" },
				await withCsrf(),
			);
			guideId = response.guide.id;
			await setActiveGuideId(guideId);
			return { guideId, isNew: true };
		}

		return { guideId, isNew: false };
	};
};

export type EnsureGuide = ReturnType<typeof createEnsureGuide>;
