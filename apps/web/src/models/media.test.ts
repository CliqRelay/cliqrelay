import { describe, expect, test } from "vitest";

import { MEDIA_REPLACE_MAX_BYTES, validateReplacementFile } from "./media";

describe("validateReplacementFile", () => {
  test.each(["image/png", "image/jpeg", "image/webp"])(
    "accepts %s under the size cap",
    (type) => {
      expect(validateReplacementFile({ type, size: 1024 }).success).toBe(true);
    },
  );

  test.each(["image/gif", "application/pdf", ""])("rejects %s", (type) => {
    expect(validateReplacementFile({ type, size: 1024 }).success).toBe(false);
  });

  test("rejects files over the size cap", () => {
    const result = validateReplacementFile({
      type: "image/png",
      size: MEDIA_REPLACE_MAX_BYTES + 1,
    });

    expect(result.success).toBe(false);
  });

  test("accepts a file exactly at the size cap", () => {
    expect(
      validateReplacementFile({
        type: "image/png",
        size: MEDIA_REPLACE_MAX_BYTES,
      }).success,
    ).toBe(true);
  });

  test("rejects empty files", () => {
    expect(
      validateReplacementFile({ type: "image/png", size: 0 }).success,
    ).toBe(false);
  });
});
