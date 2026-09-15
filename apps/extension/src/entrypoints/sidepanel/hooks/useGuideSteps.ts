import { useState } from "react";

import type { GetAllStepsByGuideIdParams, Step } from "@repo/api-client";
import { api } from "@repo/api-client";

import { isUnauthorizedError } from "@/lib/api-error";

export const STEPS_PAGE_SIZE = 20;

export const buildGuideStepsParams = (guideId: string | null): GetAllStepsByGuideIdParams => ({
  guide_id: guideId ?? undefined,
  limit: STEPS_PAGE_SIZE,
});

type UseGuideStepsResult = {
  steps: Step[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  deleteStep: (stepId: string) => Promise<void>;
  isDeleting: string | null;
  refetch: () => void;
};

export function useGuideSteps(guideId: string | null): UseGuideStepsResult {
  const query = api.steps.useGetAllStepsByGuideIdInfinite(buildGuideStepsParams(guideId), {
    query: {
      enabled: !!guideId,
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
    request: {
      credentials: "include",
    },
  });

  const deleteMutation = api.steps.useDeleteStep({
    request: {
      credentials: "include",
    },
  });

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const steps = query.data?.pages.flatMap((page) => page.steps) ?? [];
  const total = query.data?.pages[0]?.total ?? steps.length;

  const queryError =
    !isUnauthorizedError(query.error) && query.error instanceof Error ? query.error : null;

  const deleteStep = async (stepId: string) => {
    setIsDeleting(stepId);
    try {
      await deleteMutation.mutateAsync({ id: stepId });
      query.refetch();
    } finally {
      setIsDeleting(null);
    }
  };

  return {
    steps,
    total,
    isLoading: query.isLoading,
    error: queryError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    deleteStep,
    isDeleting,
    refetch: query.refetch,
  };
}
