import type { User as AuthulaUser } from "authula";

export type AppUser = Omit<AuthulaUser, "metadata"> & {
	metadata: Record<string, any>;
};
