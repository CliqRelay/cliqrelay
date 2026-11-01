import { describe, expect, test } from "vitest";

import { getReorderNeighbours, getStepAnchorId, getStepTitle } from "./steps";
import { makeCanvasStep, makeInteractionStep } from "@/test/fixtures/steps";

const steps = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

describe("getReorderNeighbours", () => {
  test("dragging down places the step after the over item", () => {
    expect(getReorderNeighbours(steps, "a", "c")).toEqual({
      targetStepId: "a",
      prevStepId: "c",
      nextStepId: "d",
    });
  });

  test("dragging up places the step before the over item", () => {
    expect(getReorderNeighbours(steps, "d", "b")).toEqual({
      targetStepId: "d",
      prevStepId: "a",
      nextStepId: "b",
    });
  });

  test("dragging to the first position has no previous step", () => {
    expect(getReorderNeighbours(steps, "c", "a")).toEqual({
      targetStepId: "c",
      prevStepId: null,
      nextStepId: "a",
    });
  });

  test("dragging to the last position has no next step", () => {
    expect(getReorderNeighbours(steps, "a", "d")).toEqual({
      targetStepId: "a",
      prevStepId: "d",
      nextStepId: null,
    });
  });

  test.each([
    ["same id", steps, "a", "a"],
    ["missing over item", steps, "a", undefined],
    ["unknown active id", steps, "z", "a"],
    ["unknown over id", steps, "a", "z"],
  ])("returns null for %s", (_label, items, activeId, overId) => {
    expect(getReorderNeighbours(items, activeId, overId)).toBeNull();
  });
});

describe("getStepTitle", () => {
  test("uses the trimmed interaction action text", () => {
    expect(getStepTitle(makeInteractionStep({ actionText: "  Click Save  " }), 2)).toBe(
      "Click Save",
    );
  });

  test("falls back to the step number when interaction text is missing", () => {
    expect(getStepTitle(makeInteractionStep({ actionText: "" }), 2)).toBe("Step 2");
  });

  test("uses the canvas heading", () => {
    expect(getStepTitle(makeCanvasStep({ headingText: "  Section title  " }), 3)).toBe(
      "Section title",
    );
  });

  test("falls back to the capitalised canvas type", () => {
    expect(getStepTitle(makeCanvasStep({ headingText: "" }), 3)).toBe("Tip");
  });

  test("falls back to Canvas when there is no canvas content", () => {
    expect(getStepTitle(makeCanvasStep({}, { canvasContent: undefined }), 3)).toBe("Canvas");
  });
});

describe("getStepAnchorId", () => {
  test("builds a stable anchor id", () => {
    expect(getStepAnchorId("abc")).toBe("step-abc");
  });
});
