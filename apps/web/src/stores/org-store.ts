import { create } from "zustand";

interface Organization {
	id: string;
	name: string;
	slug: string;
	ownerId: string;
	logo?: string | null;
}

interface OrgState {
	orgId: string | null;
	orgName: string | null;
	orgOwnerId: string | null;
	organizations: Organization[];
	setOrg: (id: string, name: string, ownerId: string) => void;
	setOrganizations: (orgs: Organization[]) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
	orgId: null,
	orgName: null,
	orgOwnerId: null,
	organizations: [],

	setOrg: (orgId, orgName, orgOwnerId) => set({ orgId, orgName, orgOwnerId }),
	setOrganizations: (organizations) => set({ organizations }),
}));
