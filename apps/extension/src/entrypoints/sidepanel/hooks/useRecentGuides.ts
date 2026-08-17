import type { GetAllGuidesParams, Guide } from "@repo/api-client";
import { ApiError, api } from "@repo/api-client";

import { useActiveTeamId } from "./useActiveTeamId";

export const RECENT_GUIDES_LIMIT = 5;

export const buildRecentGuidesParams = (
	teamId: string | null,
): GetAllGuidesParams => ({
	team_id: teamId ?? undefined,
	page: 1,
	limit: RECENT_GUIDES_LIMIT,
	sort_by: "updated_at",
	sort_dir: "desc",
	exclude_archived: true,
});

type UseRecentGuidesResult = {
	guides: Guide[];
	isLoading: boolean;
	error: Error | null;
	isSignedOut: boolean;
	refetch: () => void;
};

export function useRecentGuides(): UseRecentGuidesResult {
	const { teamId, isLoading: isTeamLoading } = useActiveTeamId();

	const query = api.guides.useGetAllGuides(buildRecentGuidesParams(teamId), {
		query: {
			enabled: !!teamId,
		},
		request: {
			credentials: "include",
		},
	});

	// No active-team cookie, or a stale cookie the API rejects: both mean the
	// user is not signed in, and neither should surface as a hard error.
	const isUnauthorized =
		query.error instanceof ApiError && query.error.status === 401;
	const isSignedOut = (!isTeamLoading && !teamId) || isUnauthorized;

	const error =
		!isUnauthorized && query.error instanceof Error ? query.error : null;

	return {
		guides: query.data?.data ?? [],
		isLoading: isTeamLoading || (!!teamId && query.isLoading),
		error,
		isSignedOut,
		refetch: query.refetch,
	};
}
