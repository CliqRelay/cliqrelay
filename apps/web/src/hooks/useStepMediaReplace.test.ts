// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { replaceStepMedia, invalidateQueries, toast } = vi.hoisted(() => ({
  replaceStepMedia: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: { loading: vi.fn(() => "toast-id"), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("@repo/api-client", () => ({
  api: {
    guides: { getGetGuideByIdQueryKey: (id: string) => [`/api/v1/guides/${id}`] },
    uploads: {
      usePresignUpload: () => ({ mutateAsync: vi.fn() }),
      useReplaceUpload: () => ({ mutateAsync: vi.fn() }),
    },
  },
}));

vi.mock("@/lib/toast", () => ({ toast }));
vi.mock("@/models", () => ({ validateReplacementFile: () => ({ success: true }) }));
vi.mock("@/services/steps/step-media-replace.service", () => ({
  createReplaceStepMedia: () => replaceStepMedia,
  putObjectWithXhr: vi.fn(),
}));
vi.mock("@/utils/http.utils", () => ({ getCsrfTokenHeader: () => ({}) }));
vi.mock("@/utils/image.utils", () => ({ processImageFileForUpload: vi.fn() }));

import { useStepMediaReplace } from "./useStepMediaReplace";

const file = new File(["x"], "shot.png", { type: "image/png" });

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useStepMediaReplace", () => {
  beforeEach(() => {
    replaceStepMedia.mockReset();
    invalidateQueries.mockReset();
    toast.error.mockReset();
  });

  test("uploads for different steps run at the same time", async () => {
    const first = deferred();
    const second = deferred();
    replaceStepMedia.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useStepMediaReplace("guide-1"));

    await act(async () => {
      void result.current.handleReplaceMedia("s1", file);
      void result.current.handleReplaceMedia("s2", file);
    });

    expect(replaceStepMedia).toHaveBeenCalledTimes(2);
    expect(result.current.replacingStepIds).toEqual(["s1", "s2"]);

    await act(async () => {
      first.resolve();
    });
    expect(result.current.replacingStepIds).toEqual(["s2"]);

    await act(async () => {
      second.resolve();
    });
    expect(result.current.replacingStepIds).toEqual([]);
  });

  test("a failed upload clears only its own step", async () => {
    const first = deferred();
    const second = deferred();
    replaceStepMedia.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useStepMediaReplace("guide-1"));

    await act(async () => {
      void result.current.handleReplaceMedia("s1", file);
      void result.current.handleReplaceMedia("s2", file);
    });

    await act(async () => {
      first.reject(new Error("boom"));
    });

    expect(toast.error).toHaveBeenCalledWith("Error", { description: "boom" });
    expect(result.current.replacingStepIds).toEqual(["s2"]);
  });

  test("ignores a second request for a step that is already uploading", async () => {
    replaceStepMedia.mockReturnValue(deferred().promise);

    const { result } = renderHook(() => useStepMediaReplace("guide-1"));

    await act(async () => {
      void result.current.handleReplaceMedia("s1", file);
    });
    await act(async () => {
      void result.current.handleReplaceMedia("s1", file);
    });

    expect(replaceStepMedia).toHaveBeenCalledTimes(1);
    expect(result.current.replacingStepIds).toEqual(["s1"]);
  });
});
