import { useQueryClient } from "@tanstack/react-query";

import { api, type CreateStepRequest, type UpdateStepRequest } from "@repo/api-client";

import { stepsQueryKey } from "@/constants/steps";
import { toast } from "@/lib/toast";
import type { StepTypeOption } from "@/models";
import { STEP_TYPE_CONFIG } from "@/models";
import { getCsrfTokenHeader } from "@/utils/http.utils";
import { reorderStepsInPages, type StepsInfiniteData } from "@/utils/steps.utils";

export function useGuideStepMutations(guideId: string) {
  const queryClient = useQueryClient();

  const queryKey = stepsQueryKey(guideId);

  const invalidateSteps = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const invalidateStepsAndGuide = () => {
    invalidateSteps();
    queryClient.invalidateQueries({
      queryKey: api.guides.getGetGuideByIdQueryKey(guideId),
    });
  };

  const createStep = api.steps.useCreateStep({
    mutation: {
      onSuccess: invalidateStepsAndGuide,
      onError: (error) => {
        toast.error("Error", {
          description: error instanceof Error ? error.message : "Failed to create step",
        });
      },
    },
    request: {
      credentials: "include",
      headers: {
        ...getCsrfTokenHeader(),
      },
    },
  });

  const updateStep = api.steps.useUpdateStep({
    mutation: {
      onSuccess: invalidateStepsAndGuide,
      onError: (error) => {
        toast.error("Error", {
          description: error instanceof Error ? error.message : "Failed to update step",
        });
      },
    },
    request: {
      credentials: "include",
      headers: {
        ...getCsrfTokenHeader(),
      },
    },
  });

  const deleteStep = api.steps.useDeleteStep({
    mutation: {
      onSuccess: invalidateStepsAndGuide,
      onError: (error) => {
        toast.error("Error", {
          description: error instanceof Error ? error.message : "Failed to delete step",
        });
      },
    },
    request: {
      credentials: "include",
    },
  });

  const duplicateStep = api.steps.useDuplicateStep({
    mutation: {
      onSuccess: invalidateStepsAndGuide,
      onError: (error) => {
        toast.error("Error", {
          description: error instanceof Error ? error.message : "Failed to duplicate step",
        });
      },
    },
    request: {
      credentials: "include",
      headers: {
        ...getCsrfTokenHeader(),
      },
    },
  });

  const reorderSteps = api.steps.useReorderSteps({
    mutation: {
      onMutate: async ({ data }) => {
        if (!data) {
          return;
        }

        await queryClient.cancelQueries({ queryKey });

        const previousSteps = queryClient.getQueryData<StepsInfiniteData>(queryKey);

        queryClient.setQueryData<StepsInfiniteData>(queryKey, (current) =>
          current
            ? reorderStepsInPages(current, data.targetStepId, data.prevStepId, data.nextStepId)
            : current,
        );

        return { previousSteps };
      },
      onError: (error, _params, context) => {
        if (context?.previousSteps) {
          queryClient.setQueryData(queryKey, context.previousSteps);
        }
        toast.error("Error", {
          description: error instanceof Error ? error.message : "Failed to reorder steps",
        });
      },
      onSettled: () => {
        invalidateSteps();
      },
    },
    request: {
      credentials: "include",
      headers: {
        ...getCsrfTokenHeader(),
      },
    },
  });

  const handleAddStepWithType = async (
    type: StepTypeOption,
    selectStep: (stepId: string | null) => void,
    insertBeforeStepId?: string,
  ) => {
    const config = STEP_TYPE_CONFIG[type];
    const data: CreateStepRequest = {
      guideId,
      type: config.type,
      ...(config.canvasType
        ? {
            canvasContent: {
              type: config.canvasType,
              headingText: "",
              bodyText: "",
            },
          }
        : {}),
      ...(insertBeforeStepId ? { insertBeforeStepId } : {}),
    };
    await createStep.mutateAsync(
      {
        data,
      },
      {
        onSuccess: ({ step }) => {
          selectStep(step?.id ?? null);
        },
      },
    );
  };

  const handleSave = (stepId: string, updates: Record<string, unknown>) => {
    updateStep.mutate({
      id: stepId,
      data: updates as UpdateStepRequest,
    });
  };

  const handleDelete = (
    stepId: string,
    selectedStepId: string | null,
    selectStep: (stepId: string | null) => void,
  ) => {
    deleteStep.mutate({
      id: stepId,
    });
    if (selectedStepId === stepId) {
      selectStep(null);
    }
  };

  const handleDuplicate = async (stepId: string) => {
    duplicateStep.mutate({
      id: stepId,
      data: {
        insertAfterStepId: stepId,
        insertBeforeStepId: null,
      },
    });
  };

  const handleReorder = (
    targetStepId: string,
    prevStepId: string | null,
    nextStepId: string | null,
  ) => {
    reorderSteps.mutate({
      data: {
        guideId,
        targetStepId,
        prevStepId,
        nextStepId,
      },
    });
  };

  return {
    handleAddStepWithType,
    handleSave,
    handleDelete,
    handleDuplicate,
    handleReorder,
  };
}
