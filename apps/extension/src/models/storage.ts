export type BrowserStorage = {
	get: (keys: string[]) => Promise<Record<string, unknown>>;
	set: (items: Record<string, unknown>) => Promise<void>;
};
