import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "@/constants/query-keys";
import { getActiveTeamId } from "@/lib/active-team";

const ACTIVE_TEAM_ID_STALE_TIME = 5 * 60 * 1000;

type UseActiveTeamIdResult = {
	teamId: string | null;
	isLoading: boolean;
};

export function useActiveTeamId(): UseActiveTeamIdResult {
	const query = useQuery({
		queryKey: [QueryKeys.ACTIVE_TEAM_ID],
		queryFn: () => getActiveTeamId().then((id) => id ?? null),
		staleTime: ACTIVE_TEAM_ID_STALE_TIME,
	});

	return {
		teamId: query.data ?? null,
		isLoading: query.isLoading,
	};
}
