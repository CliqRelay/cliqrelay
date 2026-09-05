import { useCallback, useState } from "react";

import { api, type Step } from "@repo/api-client";

import { isUnauthorizedError } from "@/lib/api-error";

type UseGuideStepsResult = {
	steps: Step[];
	isLoading: boolean;
	error: Error | null;
	deleteStep: (stepId: string) => Promise<void>;
	isDeleting: string | null;
	refetch: () => void;
};

export function useGuideSteps(guideId: string | null): UseGuideStepsResult {
	const query = api.steps.useGetAllStepsByGuideId(
		{ guide_id: guideId ?? undefined },
		{
			query: {
				enabled: !!guideId,
			},
			request: {
				credentials: "include",
			},
		},
	);

	const deleteMutation = api.steps.useDeleteStep({
		request: {
			credentials: "include",
		},
	});

	const [isDeleting, setIsDeleting] = useState<string | null>(null);

	const steps = query.data?.steps ?? [];

	// A 401/403 means the session is gone, and the panel is already routing back
	// to sign-in. Surfacing it here would only add a misleading "failed to load
	// steps" on top of that.
	const queryError =
		!isUnauthorizedError(query.error) && query.error instanceof Error
			? query.error
			: null;

	const deleteStep = useCallback(
		async (stepId: string) => {
			setIsDeleting(stepId);
			try {
				await deleteMutation.mutateAsync({ id: stepId });
				query.refetch();
			} finally {
				setIsDeleting(null);
			}
		},
		[deleteMutation, query],
	);

	return {
		steps,
		isLoading: query.isLoading,
		error: queryError,
		deleteStep,
		isDeleting,
		refetch: query.refetch,
	};
}
