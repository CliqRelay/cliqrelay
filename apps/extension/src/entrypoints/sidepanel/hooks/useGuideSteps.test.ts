import { describe, expect, test } from "vitest";

import { buildGuideStepsParams, STEPS_PAGE_SIZE } from "./useGuideSteps";

describe("GuideSteps", () => {
  describe("buildGuideStepsParams", () => {
    test("should request the first page for the given guide", () => {
      expect(buildGuideStepsParams("guide-123")).toEqual({
        guide_id: "guide-123",
        limit: STEPS_PAGE_SIZE,
      });
    });

    test("should omit the guide id when there is no active guide", () => {
      expect(buildGuideStepsParams(null).guide_id).toBeUndefined();
    });

    test("should page twenty steps at a time", () => {
      expect(STEPS_PAGE_SIZE).toBe(20);
    });
  });
});
