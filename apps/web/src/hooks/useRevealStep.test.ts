// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { getStepAnchorId } from "@/models";

const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: { current: false } }));

vi.mock("motion/react", () => ({
  useReducedMotion: () => reducedMotion.current,
}));

import { useRevealStep } from "./useRevealStep";

function mountStep(stepId: string) {
  const element = document.createElement("div");
  element.id = getStepAnchorId(stepId);
  element.scrollIntoView = vi.fn();
  document.body.appendChild(element);
  return element;
}

describe("useRevealStep", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    reducedMotion.current = false;
  });

  test("selects the step, focuses and scrolls its anchored element", () => {
    const element = mountStep("step-1");
    const focus = vi.spyOn(element, "focus");
    const selectStep = vi.fn();

    const { result } = renderHook(() => useRevealStep(selectStep));
    result.current("step-1");

    expect(selectStep).toHaveBeenCalledWith("step-1");
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(element.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  test("scrolls instantly when reduced motion is preferred", () => {
    reducedMotion.current = true;
    const element = mountStep("step-1");
    const selectStep = vi.fn();

    const { result } = renderHook(() => useRevealStep(selectStep));
    result.current("step-1");

    expect(element.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
    });
  });

  test("selects the step without scrolling when the anchor is missing", () => {
    const selectStep = vi.fn();

    const { result } = renderHook(() => useRevealStep(selectStep));
    result.current("missing");

    expect(selectStep).toHaveBeenCalledWith("missing");
    expect(document.body.querySelector(`#${getStepAnchorId("missing")}`)).toBeNull();
  });
});
