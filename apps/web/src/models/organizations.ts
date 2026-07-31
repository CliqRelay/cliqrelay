import type { OrganizationMemberResponse } from "authula";

import type { AppUser } from "./auth";

export type AppOrganizationMemberResponse = Omit<
	OrganizationMemberResponse,
	"user"
> & {
	user: AppUser;
};
