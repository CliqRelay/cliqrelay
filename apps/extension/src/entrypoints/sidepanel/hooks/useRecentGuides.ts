import type { GetAllGuidesParams, Guide } from "@repo/api-client";
import { api } from "@repo/api-client";

import { isUnauthorizedError } from "@/lib/api-error";
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
	hasNoTeam: boolean;
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

	// "Signed out" is the route guard's job now. What is left here is the team:
	// a user with a session but no active-team cookie has nothing to list.
	const hasNoTeam = !isTeamLoading && !teamId;

	// A 401/403 means the session died between the guard and this request. The
	// panel is already on its way back to sign-in, so don't shout about it.
	const error =
		!isUnauthorizedError(query.error) && query.error instanceof Error
			? query.error
			: null;

	return {
		guides: query.data?.data ?? [],
		isLoading: isTeamLoading || (!!teamId && query.isLoading),
		error,
		hasNoTeam,
		refetch: query.refetch,
	};
}
