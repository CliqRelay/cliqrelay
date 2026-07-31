import type { QueryClient } from "@tanstack/react-query";

import { api } from "@repo/api-client";

export function invalidateGetAllGuides(queryClient: QueryClient) {
	queryClient.invalidateQueries({
		queryKey: api.guides.getGetAllGuidesQueryKey(),
	});
}

export function invalidateGuidesCount(queryClient: QueryClient) {
	queryClient.invalidateQueries({
		queryKey: api.guides.getGetGuidesCountQueryKey(),
	});
}
