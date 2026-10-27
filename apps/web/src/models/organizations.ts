import type { OrganizationMemberResponse } from "authula/models";

import type { AppUser } from "./auth";

export type AppOrganizationMemberResponse = Omit<
	OrganizationMemberResponse,
	"user"
> & {
	user: AppUser;
};
