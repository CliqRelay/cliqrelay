// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { starGuide, unstarGuide, invalidateQueries, toast } = vi.hoisted(() => ({
  starGuide: vi.fn(),
  unstarGuide: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: { error: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("@repo/api-client", () => ({
  api: {
    guides: {
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
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/v1/guides"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/v1/guides/starred"] });
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
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
