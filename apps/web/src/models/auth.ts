import type { User as AuthulaUser } from "authula/models";

export type AppUser = Omit<AuthulaUser, "metadata"> & {
	metadata: Record<string, any>;
};


