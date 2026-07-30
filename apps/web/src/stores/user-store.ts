import { create } from "zustand";

interface UserState {
	userId: string | null;
	userName: string | null;
	userEmail: string | null;
	setUser: (userId: string, name?: string, email?: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
	userId: null,
	userName: null,
	userEmail: null,

	setUser: (userId, name, email) =>
		set({ userId, userName: name ?? null, userEmail: email ?? null }),
}));
