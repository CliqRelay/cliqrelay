import { useQueryClient } from "@tanstack/react-query";

import { api, type Step, type UpdateStepRequest } from "@repo/api-client";

import { STEPS_PAGE_SIZE, stepsQueryKey } from "@/constants/steps";
import { toast } from "@/lib/toast";
import { useEditorStore } from "@/stores";

export function useStepEditor(guideId: string) {
  const queryClient = useQueryClient();

  const queryKey = stepsQueryKey(guideId);

  const query = api.steps.useGetAllStepsByGuideIdInfinite(
    {
      guide_id: guideId,
      limit: STEPS_PAGE_SIZE,
    },
    {
      query: {
        queryKey,
        enabled: !!guideId,
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      },
      request: {
        credentials: "include",
      },
    },
  );

  const updateStep = api.steps.useUpdateStep({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      },
      onError: (error) => {
        toast.error("Error", {
          description: error instanceof Error ? error.message : "Failed to update step",
        });
      },
    },
    request: {
      credentials: "include",
    },
  });

  const steps = query.data?.pages.flatMap((page) => page.steps) ?? [];
  const typedSteps = steps as unknown as Step[];
  const totalSteps = query.data?.pages[0]?.total ?? typedSteps.length;

  const selectedStepId = useEditorStore((state) => state.selectedStepId);
  const dirtyStepIds = useEditorStore((state) => state.dirtyStepIds);
  const setSelectedStepId = useEditorStore((state) => state.setSelectedStepId);
  const markClean = useEditorStore((state) => state.markClean);

  const selectStep = (stepId: string | null) => setSelectedStepId(stepId);

  const saveStep = async (stepId: string) => {
    const step = typedSteps.find((s) => s.id === stepId);
    if (!step) {
      return;
    }

    const { id: _id, guideId: _gid, createdAt: _ca, updatedAt: _ua, ...rest } = step;

    try {
      await updateStep.mutateAsync({
        id: stepId,
        data: rest as UpdateStepRequest,
      });
      markClean(stepId);
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to save step",
      });
    }
  };

  const saveAllDirty = async () => {
    for (const stepId of Object.keys(dirtyStepIds)) {
      const step = typedSteps.find((s) => s.id === stepId);
      if (!step) {
        continue;
      }

      const { id: _id, guideId: _gid, createdAt: _ca, updatedAt: _ua, ...rest } = step;

      try {
        await updateStep.mutateAsync({
          id: stepId,
          data: rest as UpdateStepRequest,
        });
        markClean(stepId);
      } catch (error) {
        toast.error("Error", {
          description: error instanceof Error ? error.message : `Failed to save step ${stepId}`,
        });
      }
    }
  };

  const getSelectedStep = (): Step | null => {
    if (!selectedStepId) {
      return null;
    }
    return typedSteps.find((s) => s.id === selectedStepId) ?? null;
  };

  return {
    steps: typedSteps,
    totalSteps,
    selectedStepId,
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    dirtyStepIds,
    selectStep,
    saveStep,
    saveAllDirty,
    getSelectedStep,
  };
}
