import type { User as AuthulaUser, OrganizationMemberResponse } from "authula";

// TODO: the original Authula types need to be updated to replace "unknown" for "any" then
// we could remove these types and use Authula's types directly without Tanstack throwing serializable errors. 
export type AppUser = Omit<AuthulaUser, "metadata"> & {
	metadata: Record<string, any>;
};

export type AppOrganizationMemberResponse = Omit<
	OrganizationMemberResponse,
	"user"
> & {
	user: AppUser;
};
