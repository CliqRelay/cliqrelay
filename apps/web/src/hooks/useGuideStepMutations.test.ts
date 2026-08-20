import { beforeEach, describe, expect, test, vi } from "vitest";

type MutationCallbacks = { onSuccess?: () => void; onSettled?: () => void };

const { capturedOptions, invalidateQueries } = vi.hoisted(() => ({
	capturedOptions: {} as Record<string, MutationCallbacks>,
	invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({
		invalidateQueries,
		cancelQueries: vi.fn(),
		getQueryData: vi.fn(),
		setQueryData: vi.fn(),
	}),
}));

vi.mock("@/lib/toast", () => ({
	toast: { error: vi.fn() },
}));

vi.mock("@repo/api-client", () => {
	const captureMutation =
		(name: string) => (options?: { mutation?: MutationCallbacks }) => {
			capturedOptions[name] = options?.mutation ?? {};
			return { mutate: vi.fn(), mutateAsync: vi.fn() };
		};

	return {
		api: {
			guides: {
				getGetGuideByIdQueryKey: (id: string) => [`/api/v1/guides/${id}`],
			},
			steps: {
				useCreateStep: captureMutation("createStep"),
				useUpdateStep: captureMutation("updateStep"),
				useDeleteStep: captureMutation("deleteStep"),
				useDuplicateStep: captureMutation("duplicateStep"),
				useReorderSteps: captureMutation("reorderSteps"),
			},
		},
	};
});

vi.mock("@/utils/http.utils", () => ({
	getCsrfTokenHeader: () => ({}),
}));

import { useGuideStepMutations } from "./useGuideStepMutations";

const GUIDE_ID = "guide-1";
const STEPS_QUERY_KEY = ["guide-steps", GUIDE_ID];
const GUIDE_QUERY_KEY = [`/api/v1/guides/${GUIDE_ID}`];

describe("useGuideStepMutations", () => {
	beforeEach(() => {
		invalidateQueries.mockClear();
		useGuideStepMutations(GUIDE_ID);
	});

	test.each(["createStep", "updateStep", "deleteStep", "duplicateStep"])(
		"%s invalidates both the steps and the guide so the recalculated duration is refetched",
		(mutation) => {
			capturedOptions[mutation].onSuccess?.();

			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: STEPS_QUERY_KEY,
			});
			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: GUIDE_QUERY_KEY,
			});
		},
	);

	test("reorderSteps invalidates only the steps because the duration is order independent", () => {
		capturedOptions.reorderSteps.onSettled?.();

		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: STEPS_QUERY_KEY,
		});
		expect(invalidateQueries).not.toHaveBeenCalledWith({
			queryKey: GUIDE_QUERY_KEY,
		});
	});
});
