import type { QueryClient } from "@tanstack/react-query";

import { api } from "@repo/api-client";

export function invalidateGuideLists(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: api.guides.getGetAllGuidesQueryKey(),
  });
  queryClient.invalidateQueries({
    queryKey: api.guides.getGetStarredGuidesQueryKey(),
  });
}

export function invalidateGetAllGuides(queryClient: QueryClient) {
  invalidateGuideLists(queryClient);
}

export function invalidateGuideDetail(queryClient: QueryClient, guideId: string) {
  queryClient.invalidateQueries({
    queryKey: api.guides.getGetGuideByIdQueryKey(guideId),
  });
}

export function invalidateGuideQueries(queryClient: QueryClient, guideId?: string) {
  invalidateGuideLists(queryClient);
  if (guideId) {
    invalidateGuideDetail(queryClient, guideId);
  }
}

export function invalidateGuidesCount(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: api.guides.getGetGuidesCountQueryKey(),
  });
}
