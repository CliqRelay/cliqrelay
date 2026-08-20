import { useQueryClient } from "@tanstack/react-query";

import {
	api,
	type CreateStepRequest,
	type GetAllStepsResponse,
	type UpdateStepRequest,
} from "@repo/api-client";

import { toast } from "@/lib/toast";
import type { StepTypeOption } from "@/models";
import { STEP_TYPE_CONFIG } from "@/models";
import { getCsrfTokenHeader } from "@/utils/http.utils";

export function useGuideStepMutations(guideId: string) {
	const queryClient = useQueryClient();

	const queryKey = ["guide-steps", guideId];

	const invalidateSteps = () => {
		queryClient.invalidateQueries({ queryKey });
	};

	// The backend recalculates the guide's duration whenever the set of steps or their
	// content changes, so the guide itself is refetched alongside the steps. Reordering
	// is excluded because the duration is an order-independent sum.
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
					description:
						error instanceof Error ? error.message : "Failed to create step",
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
					description:
						error instanceof Error ? error.message : "Failed to update step",
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
					description:
						error instanceof Error ? error.message : "Failed to delete step",
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
					description:
						error instanceof Error ? error.message : "Failed to duplicate step",
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

				const previousResponse =
					queryClient.getQueryData<GetAllStepsResponse>(queryKey);

				queryClient.setQueryData<GetAllStepsResponse>(queryKey, (response) => {
					if (!response?.steps) {
						return {
							steps: previousResponse?.steps ?? [],
						};
					}

					const newSteps = [...(response.steps ?? [])];
					const sorted = [...newSteps].sort((a, b) => {
						if (a.sortOrder < b.sortOrder) return -1;
						if (a.sortOrder > b.sortOrder) return 1;
						return 0;
					});

					const targetIndex = sorted.findIndex(
						(s) => s.id === data.targetStepId,
					);
					if (targetIndex === -1) {
						return {
							steps: previousResponse?.steps ?? [],
						};
					}
					const [targetStep] = sorted.splice(targetIndex, 1);

					let insertIndex: number;
					if (data.prevStepId) {
						const prevIndex = sorted.findIndex((s) => s.id === data.prevStepId);
						insertIndex = prevIndex + 1;
					} else if (data.nextStepId) {
						const nextIndex = sorted.findIndex((s) => s.id === data.nextStepId);
						insertIndex = nextIndex;
					} else {
						insertIndex = sorted.length;
					}

					sorted.splice(insertIndex, 0, targetStep);
					return {
						steps: sorted,
					};
				});

				return { previousSteps: previousResponse };
			},
			onError: (error, _params, context) => {
				if (context?.previousSteps) {
					queryClient.setQueryData(queryKey, context.previousSteps);
				}
				toast.error("Error", {
					description:
						error instanceof Error ? error.message : "Failed to reorder steps",
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
				insertAfterStepId: null,
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
