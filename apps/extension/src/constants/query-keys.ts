/**
 * Cache keys for React Query domains that `@repo/api-client` does not cover.
 *
 * Domains covered by the SDK use the generated key factories
 * (e.g. `getGetAllGuidesQueryKey()`) instead and must NOT be listed here.
 */
export enum QueryKeys {
	ACTIVE_TEAM_ID = "active_team_id",
}
