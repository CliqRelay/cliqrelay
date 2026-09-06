import type { GetAllGuidesParams, Guide } from "@repo/api-client";
import { api } from "@repo/api-client";

import { useActiveTeamId } from "./useActiveTeamId";
import { isUnauthorizedError } from "@/lib/api-error";

export const RECENT_GUIDES_LIMIT = 5;

export const buildRecentGuidesParams = (teamId: string | null): GetAllGuidesParams => ({
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

  const hasNoTeam = !isTeamLoading && !teamId;

  const error =
    !isUnauthorizedError(query.error) && query.error instanceof Error ? query.error : null;

  return {
    guides: query.data?.data ?? [],
    isLoading: isTeamLoading || (!!teamId && query.isLoading),
    error,
    hasNoTeam,
    refetch: query.refetch,
  };
}
