import { describe, expect, test } from "vitest";

import type { ActivityLog } from "@repo/api-client";

import { getActivityDetails, mergeActivityLogs } from "./activity";

const log = (id: string, guideTitle = "Guide"): ActivityLog =>
  ({ id, metadata: { guide: { title: guideTitle } } }) as unknown as ActivityLog;

describe("mergeActivityLogs", () => {
  test("prepends a new entry", () => {
    const merged = mergeActivityLogs([log("a"), log("b")], log("c"), 10);
    expect(merged.map((l) => l.id)).toEqual(["c", "a", "b"]);
  });

  test("replaces an entry with the same id and moves it to the top", () => {
    const merged = mergeActivityLogs([log("a"), log("b", "Docker")], log("b", "Docker Setup"), 10);
    expect(merged.map((l) => l.id)).toEqual(["b", "a"]);
    expect(merged[0].metadata.guide?.title).toBe("Docker Setup");
  });

  test("applies the limit", () => {
    const merged = mergeActivityLogs([log("a"), log("b")], log("c"), 2);
    expect(merged.map((l) => l.id)).toEqual(["c", "a"]);
  });
});

describe("getActivityDetails", () => {
  const withTarget = (overrides: Partial<ActivityLog>): ActivityLog =>
    ({ actorId: "user-1", metadata: {}, ...overrides }) as ActivityLog;

  test("links a guide target", () => {
    const details = getActivityDetails(withTarget({ targetType: "guide", targetId: "guide-1" }));
    expect(details.guideId).toBe("guide-1");
  });

  test("does not link other targets", () => {
    const details = getActivityDetails(withTarget({ targetType: "member", targetId: "member-1" }));
    expect(details.guideId).toBeUndefined();
  });
});
