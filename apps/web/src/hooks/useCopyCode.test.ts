// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { toast } = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

vi.mock("@/lib/toast", () => ({ toast }));

import { useCopyCode } from "./useCopyCode";

describe("useCopyCode", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("copies the raw code and sets copied", async () => {
    const code = "const answer = 42;\n";
    const { result } = renderHook(() => useCopyCode(code));

    await act(async () => {
      await result.current.copy();
    });

    expect(writeText).toHaveBeenCalledWith(code);
    expect(result.current.copied).toBe(true);
  });

  test("resets copied after two seconds", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCopyCode("pnpm install"));

    await act(async () => {
      await result.current.copy();
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  test("shows an error toast and keeps copied false when the clipboard fails", async () => {
    writeText.mockRejectedValueOnce(new Error("Permission denied"));
    const { result } = renderHook(() => useCopyCode("pnpm install"));

    await act(async () => {
      await result.current.copy();
    });

    expect(result.current.copied).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Error", { description: "Failed to copy code" });
  });
});
