import { useQueryClient } from "@tanstack/react-query";

import { api, type Step, type UpdateStepRequest } from "@repo/api-client";

import { toast } from "@/hooks/use-toast";
import { useEditorStore } from "@/store/editor-store";

export function useStepEditor(guideId: string) {
	const queryClient = useQueryClient();

	const queryKey = ["guide-steps", guideId];

	const query = api.steps.useGetAllStepsByGuideId(
		{
			guideId,
		},
		{
			query: {
				queryKey,
				enabled: !!guideId,
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
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to update step",
					variant: "destructive" as const,
				});
			},
		},
		request: {
			credentials: "include",
		},
	});

	const steps = query.data?.steps ?? [];
	const typedSteps = steps as unknown as Step[];

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

		const {
			id: _id,
			guideId: _gid,
			createdAt: _ca,
			updatedAt: _ua,
			...rest
		} = step;

		try {
			await updateStep.mutateAsync({
				id: stepId,
				data: rest as UpdateStepRequest,
			});
			markClean(stepId);
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to save step",
				variant: "destructive" as const,
			});
		}
	};

	const saveAllDirty = async () => {
		for (const stepId of Object.keys(dirtyStepIds)) {
			const step = typedSteps.find((s) => s.id === stepId);
			if (!step) {
				continue;
			}

			const {
				id: _id,
				guideId: _gid,
				createdAt: _ca,
				updatedAt: _ua,
				...rest
			} = step;

			try {
				await updateStep.mutateAsync({
					id: stepId,
					data: rest as UpdateStepRequest,
				});
				markClean(stepId);
			} catch (error) {
				toast({
					title: "Error",
					description:
						error instanceof Error
							? error.message
							: `Failed to save step ${stepId}`,
					variant: "destructive" as const,
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
		selectedStepId,
		isLoading: query.isLoading,
		dirtyStepIds,
		selectStep,
		saveStep,
		saveAllDirty,
		getSelectedStep,
	};
}
