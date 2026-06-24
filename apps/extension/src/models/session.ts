export type SessionService = {
	getActiveGuideId: () => Promise<string | undefined>;
	setActiveGuideId: (id: string | null) => Promise<void>;
};
