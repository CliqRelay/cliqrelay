import { describe, expect, test } from "vitest";

import { getGuideIdFromDashboardPath } from "./guides";

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
