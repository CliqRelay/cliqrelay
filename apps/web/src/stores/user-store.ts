import { create } from "zustand";

interface UserState {
	userId: string | null;
	setUser: (userId: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
	userId: null,

	setUser: (userId) => set({ userId }),
}));
