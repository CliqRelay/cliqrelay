import { create } from "zustand";

interface OrgState {
	orgId: string | null;
	orgName: string | null;
	setOrg: (id: string, name: string) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
	orgId: null,
	orgName: null,

	setOrg: (orgId, orgName) => set({ orgId, orgName }),
}));
