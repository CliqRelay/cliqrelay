import { describe, expect, test } from "vitest";

import type { Step } from "@repo/api-client";

import { reorderStepsInPages, stepSupportsMedia, type StepsInfiniteData } from "./steps.utils";

const step = (id: string) => ({ id, sortOrder: id }) as Step;

const data = (): StepsInfiniteData => ({
  pages: [
    { steps: [step("a"), step("b"), step("c")], nextCursor: "c", total: 5 },
    { steps: [step("d"), step("e")], nextCursor: null, total: 5 },
  ],
  pageParams: [undefined, "c"],
});

const ids = (result: StepsInfiniteData) => result.pages.map((page) => page.steps.map((s) => s.id));

describe("reorderStepsInPages", () => {
  test.each([
    {
      name: "moves down within the first page",
      target: "a",
      prev: "b",
      next: "c",
      expected: [
        ["b", "a", "c"],
        ["d", "e"],
      ],
    },
    {
      name: "moves across pages via prev",
      target: "a",
      prev: "d",
      next: "e",
      expected: [
        ["b", "c", "d"],
        ["a", "e"],
      ],
    },
    {
      name: "moves to the front via next",
      target: "e",
      prev: null,
      next: "a",
      expected: [
        ["e", "a", "b"],
        ["c", "d"],
      ],
    },
    {
      name: "moves to the end when prev is the last loaded step",
      target: "b",
      prev: "e",
      next: null,
      expected: [
        ["a", "c", "d"],
        ["e", "b"],
      ],
    },
    {
      name: "appends when neither neighbour is known",
      target: "a",
      prev: "missing",
      next: "missing",
      expected: [
        ["b", "c", "d"],
        ["e", "a"],
      ],
    },
  ])("$name", ({ target, prev, next, expected }) => {
    const input = data();

    const result = reorderStepsInPages(input, target, prev, next);

    expect(ids(result)).toEqual(expected);
    expect(result.pages.map((p) => p.steps.length)).toEqual([3, 2]);
    expect(result.pageParams).toEqual(input.pageParams);
    expect(result.pages[0].nextCursor).toBe("c");
  });

  test("returns the input unchanged when the target is not loaded", () => {
    const input = data();

    expect(reorderStepsInPages(input, "zzz", "a", "b")).toBe(input);
  });

  test("does not mutate the input pages", () => {
    const input = data();
    const before = ids(input);

    reorderStepsInPages(input, "a", "b", "c");

    expect(ids(input)).toEqual(before);
  });
});

describe("stepSupportsMedia", () => {
  test.each([
    { name: "interaction step", step: { type: "interaction" }, expected: true },
    { name: "callout", step: { type: "canvas", canvasContent: { type: "callout" } }, expected: true },
    { name: "tip", step: { type: "canvas", canvasContent: { type: "tip" } }, expected: true },
    { name: "alert", step: { type: "canvas", canvasContent: { type: "alert" } }, expected: true },
    { name: "header", step: { type: "canvas", canvasContent: { type: "header" } }, expected: false },
    { name: "canvas without content", step: { type: "canvas", canvasContent: null }, expected: false },
  ] as const)("$name", ({ step, expected }) => {
    expect(stepSupportsMedia(step)).toBe(expected);
  });
});
