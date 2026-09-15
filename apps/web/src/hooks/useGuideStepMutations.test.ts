import { beforeEach, describe, expect, test, vi } from "vitest";

type MutationCallbacks = {
  onSuccess?: () => void;
  onSettled?: () => void;
  onMutate?: (variables: { data?: Record<string, unknown> }) => Promise<unknown>;
  onError?: (error: Error, variables: unknown, context: unknown) => void;
};

const { capturedOptions, capturedMutate, invalidateQueries, getQueryData, setQueryData } =
  vi.hoisted(() => ({
    capturedOptions: {} as Record<string, MutationCallbacks>,
    capturedMutate: {} as Record<string, ReturnType<typeof vi.fn>>,
    invalidateQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  }));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries,
    cancelQueries: vi.fn(),
    getQueryData,
    setQueryData,
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@repo/api-client", () => {
  const captureMutation = (name: string) => (options?: { mutation?: MutationCallbacks }) => {
    capturedOptions[name] = options?.mutation ?? {};
    capturedMutate[name] ??= vi.fn();
    return { mutate: capturedMutate[name], mutateAsync: vi.fn() };
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

const step = (id: string) => ({ id, guideId: GUIDE_ID, sortOrder: id });

const twoPages = () => ({
  pages: [
    { steps: [step("s1"), step("s2")], nextCursor: "s2", total: 4 },
    { steps: [step("s3"), step("s4")], nextCursor: null, total: 4 },
  ],
  pageParams: [undefined, "s2"],
});

describe("useGuideStepMutations", () => {
  let hook: ReturnType<typeof useGuideStepMutations>;

  beforeEach(() => {
    invalidateQueries.mockClear();
    getQueryData.mockReset();
    setQueryData.mockReset();
    hook = useGuideStepMutations(GUIDE_ID);
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

  test("duplicateStep inserts the copy directly after its source so it lands inside the loaded pages", () => {
    hook.handleDuplicate("s2");

    expect(capturedMutate.duplicateStep).toHaveBeenCalledWith({
      id: "s2",
      data: { insertAfterStepId: "s2", insertBeforeStepId: null },
    });
  });

  describe("reorderSteps optimistic update", () => {
    test("moves the step across pages while preserving page sizes and cursors", async () => {
      const previous = twoPages();
      getQueryData.mockReturnValue(previous);

      const context = await capturedOptions.reorderSteps.onMutate?.({
        data: { targetStepId: "s1", prevStepId: "s3", nextStepId: "s4" },
      });

      expect(context).toEqual({ previousSteps: previous });
      expect(setQueryData).toHaveBeenCalledWith(STEPS_QUERY_KEY, expect.any(Function));

      const updater = setQueryData.mock.calls[0][1];
      const updated = updater(previous);

      expect(
        updated.pages.map((p: { steps: { id: string }[] }) => p.steps.map((s) => s.id)),
      ).toEqual([
        ["s2", "s3"],
        ["s1", "s4"],
      ]);
      expect(updated.pageParams).toEqual(previous.pageParams);
      expect(updated.pages[0].nextCursor).toBe("s2");
    });

    test("leaves an empty cache untouched", async () => {
      getQueryData.mockReturnValue(undefined);

      await capturedOptions.reorderSteps.onMutate?.({
        data: { targetStepId: "s1", prevStepId: null, nextStepId: null },
      });

      const updater = setQueryData.mock.calls[0][1];
      expect(updater(undefined)).toBeUndefined();
    });

    test("restores the snapshot on error", () => {
      const previous = twoPages();

      capturedOptions.reorderSteps.onError?.(
        new Error("boom"),
        {},
        {
          previousSteps: previous,
        },
      );

      expect(setQueryData).toHaveBeenCalledWith(STEPS_QUERY_KEY, previous);
    });
  });
});
