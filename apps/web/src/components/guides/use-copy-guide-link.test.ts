// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { toast } = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

vi.mock("@/lib/toast", () => ({ toast }));

import { useCopyGuideLink } from "./use-copy-guide-link";

describe("useCopyGuideLink", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  test("copies the guide URL and says who can open it", async () => {
    const { result } = renderHook(() => useCopyGuideLink());

    await result.current.copyGuideLink({ id: "g1", visibility: "team", status: "published" });

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/guides/g1`);
    expect(toast).toHaveBeenCalledWith("Link copied", {
      description: "Only your team can view this guide",
    });
  });

  test("shows an error toast when the clipboard is unavailable", async () => {
    writeText.mockRejectedValueOnce(new Error("Permission denied"));
    const { result } = renderHook(() => useCopyGuideLink());

    await result.current.copyGuideLink({ id: "g1", visibility: "public", status: "published" });

    expect(toast).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Error", { description: "Failed to copy link" });
  });
});
