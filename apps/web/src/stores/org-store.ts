import { create } from "zustand";
import type { OrganizationMemberResponse } from "authula";

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
	currentMember: OrganizationMemberResponse | null;
	setOrg: (id: string, name: string, ownerId: string) => void;
	setOrganizations: (orgs: Organization[]) => void;
	setCurrentMember: (member: OrganizationMemberResponse | null) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
	orgId: null,
	orgName: null,
	orgOwnerId: null,
	organizations: [],
	currentMember: null,

	setOrg: (orgId, orgName, orgOwnerId) => set({ orgId, orgName, orgOwnerId }),
	setOrganizations: (organizations) => set({ organizations }),
	setCurrentMember: (currentMember) => set({ currentMember }),
}));
