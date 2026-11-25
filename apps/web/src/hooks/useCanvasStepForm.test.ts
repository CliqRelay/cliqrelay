import type { KeyboardEvent } from "react";

// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useCanvasStepForm } from "./useCanvasStepForm";
import { makeCanvasStep } from "@/test/fixtures/steps";

describe("useCanvasStepForm", () => {
  test("inserts two spaces on tab", () => {
    const onUpdate = vi.fn();
    const { result } = renderHook(() =>
      useCanvasStepForm({ step: makeCanvasStep({ type: "code", code: "const" }), onUpdate }),
    );
    const textarea = {
      value: "const",
      selectionStart: 5,
      selectionEnd: 5,
      focus: vi.fn(),
      setSelectionRange: vi.fn(),
    };
    const event = {
      key: "Tab",
      preventDefault: vi.fn(),
      currentTarget: textarea,
    } as unknown as KeyboardEvent<HTMLTextAreaElement>;

    act(() => {
      result.current.handleCodeTab(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.form.getFieldValue("code")).toBe("const  ");
  });
});
