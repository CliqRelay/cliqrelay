import { create } from "zustand";

interface Team {
	id: string;
	name: string;
	organizationId: string;
}

interface TeamState {
	teams: Team[];
	activeTeamId: string | null;
	loaded: boolean;
	setTeams: (teams: Team[]) => void;
	setActiveTeam: (id: string | null) => void;
	resetTeams: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
	teams: [],
	activeTeamId: null,
	loaded: false,

	setTeams: (teams) => set({ teams, loaded: true }),
	setActiveTeam: (activeTeamId) => set({ activeTeamId }),
	resetTeams: () => set({ teams: [], activeTeamId: null, loaded: false }),
}));
