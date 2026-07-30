import type { QueryClient } from "@tanstack/react-query";

import { type GetAllGuidesResponse, type GuideStatus, api } from "@repo/api-client";

export function invalidateGuidesCount(queryClient: QueryClient) {
	queryClient.invalidateQueries({
		queryKey: api.guides.getGetGuidesCountQueryKey(),
	});
}

export function updateGuidesCache(
	queryClient: QueryClient,
	params: {
		idsToRemove: string[];
		teamId: string | undefined;
		currentPage: number;
		pageSize: number;
		status?: GuideStatus;
	},
) {
	const { idsToRemove, teamId, currentPage, pageSize, status } = params;

	queryClient.setQueriesData<GetAllGuidesResponse>(
		{ queryKey: api.guides.getGetAllGuidesQueryKey() },
		(old) => {
			if (!old) return old;
			return {
				...old,
				total: Math.max(0, old.total - idsToRemove.length),
			};
		},
	);

	const currentQueryKey = api.guides.getGetAllGuidesQueryKey({
		team_id: teamId ?? undefined,
		status: status ?? "deleted",
		page: currentPage,
		limit: pageSize,
	});
	queryClient.setQueryData<GetAllGuidesResponse>(currentQueryKey, (old) => {
		if (!old) return old;
		return {
			...old,
			data: old.data.filter((g) => !idsToRemove.includes(g.id)),
		};
	});
}
