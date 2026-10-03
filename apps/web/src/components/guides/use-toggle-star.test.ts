// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { starGuide, unstarGuide, invalidateQueries, setQueryData, toast } = vi.hoisted(() => ({
  starGuide: vi.fn(),
  unstarGuide: vi.fn(),
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  toast: { error: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries, setQueryData }),
}));

vi.mock("@repo/api-client", () => ({
  api: {
    guides: {
      getGetGuideByIdQueryKey: (id: string) => [`/api/v1/guides/${id}`],
      getGetAllGuidesQueryKey: () => ["/api/v1/guides"],
      getGetStarredGuidesQueryKey: () => ["/api/v1/guides/starred"],
    },
  },
}));

vi.mock("@/lib/toast", () => ({ toast }));
vi.mock("@/server-fns/starred-guides", () => ({ starGuide, unstarGuide }));

import { useToggleStar } from "./use-toggle-star";

describe("useToggleStar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("stars an unstarred guide and refreshes guide lists", async () => {
    const { result } = renderHook(() => useToggleStar());

    const toggled = await result.current.toggleStar({ id: "g1", isStarred: false });

    expect(toggled).toBe(true);
    expect(starGuide).toHaveBeenCalledWith({ data: { guideId: "g1" } });
    expect(unstarGuide).not.toHaveBeenCalled();
    expect(setQueryData).toHaveBeenCalledWith(["/api/v1/guides/g1"], expect.any(Function));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/v1/guides"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/v1/guides/starred"] });
  });

  test("syncs the detail cache with the new star state", async () => {
    const { result } = renderHook(() => useToggleStar());

    await result.current.toggleStar({ id: "g1", isStarred: false });

    const updater = setQueryData.mock.calls[0][1] as (old: unknown) => unknown;
    const next = updater({ guide: { id: "g1", isStarred: false, title: "T" } }) as {
      guide: { isStarred: boolean; title: string };
    };
    expect(next.guide.isStarred).toBe(true);
    expect(next.guide.title).toBe("T");
  });

  test("unstars a starred guide", async () => {
    const { result } = renderHook(() => useToggleStar());

    const toggled = await result.current.toggleStar({ id: "g1", isStarred: true });

    expect(toggled).toBe(true);
    expect(unstarGuide).toHaveBeenCalledWith({ data: { guideId: "g1" } });
    expect(starGuide).not.toHaveBeenCalled();
  });

  test("shows an error toast and skips cache refresh when the request fails", async () => {
    starGuide.mockRejectedValueOnce(new Error("Network down"));
    const { result } = renderHook(() => useToggleStar());

    const toggled = await result.current.toggleStar({ id: "g1", isStarred: false });

    expect(toggled).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Error", { description: "Network down" });
    expect(setQueryData).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
