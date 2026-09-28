import { describe, expect, test } from "vitest";

import {
  getGuideIdFromDashboardPath,
  getGuideLinkAudience,
  getPublicGuideUrl,
  PUBLIC_DRAFT_HINT,
} from "./guides";

describe("getGuideIdFromDashboardPath", () => {
  test.each(["/dashboard/guides/abc-123", "/dashboard/guides/abc-123/"])(
    "extracts the guide id from %s",
    (pathname) => {
      expect(getGuideIdFromDashboardPath(pathname)).toBe("abc-123");
    },
  );

  test.each([
    "/dashboard",
    "/dashboard/guides",
    "/dashboard/guides/",
    "/dashboard/starred/abc-123",
  ])("returns null for %s", (pathname) => {
    expect(getGuideIdFromDashboardPath(pathname)).toBeNull();
  });
});

describe("getPublicGuideUrl", () => {
  test("builds the signed-out guide URL on the given origin", () => {
    expect(getPublicGuideUrl("https://app.cliqrelay.com", "abc-123")).toBe(
      "https://app.cliqrelay.com/guides/abc-123",
    );
  });
});

describe("getGuideLinkAudience", () => {
  test.each([
    {
      visibility: "public",
      status: "published",
      expected: "Anyone with the link can view this guide",
    },
    { visibility: "public", status: "draft", expected: PUBLIC_DRAFT_HINT },
    { visibility: "team", status: "published", expected: "Only your team can view this guide" },
    { visibility: "private", status: "draft", expected: "Only you can view this guide" },
  ] as const)("$visibility $status guide: $expected", ({ visibility, status, expected }) => {
    expect(getGuideLinkAudience({ visibility, status })).toBe(expected);
  });
});
