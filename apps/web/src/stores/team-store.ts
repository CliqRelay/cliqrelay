import { create } from "zustand";

interface Team {
	id: string;
	name: string;
}

interface TeamState {
	teams: Team[];
	activeTeamId: string | null;
	setTeams: (teams: Team[]) => void;
	setActiveTeam: (id: string) => void;
}

export const useTeamStore = create<TeamState>((set) => ({
	teams: [],
	activeTeamId: null,

	setTeams: (teams) => set({ teams }),
	setActiveTeam: (activeTeamId) => set({ activeTeamId }),
}));
