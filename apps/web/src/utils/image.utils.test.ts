import { describe, expect, test } from "vitest";

import { dataUrlToBlob, sniffImageMimeType } from "./image.utils";

const bytes = (...values: number[]) => Uint8Array.from(values);

const ascii = (value: string) =>
  bytes(...value.split("").map((character) => character.charCodeAt(0)));

describe("sniffImageMimeType", () => {
  test("detects WebP", () => {
    expect(
      sniffImageMimeType(Uint8Array.from([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")])),
    ).toBe("image/webp");
  });

  test("detects PNG", () => {
    expect(sniffImageMimeType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
  });

  test("detects JPEG", () => {
    expect(sniffImageMimeType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  test("returns null for unknown bytes", () => {
    expect(sniffImageMimeType(bytes(1, 2, 3, 4))).toBeNull();
  });

  test("returns null for a truncated WebP header", () => {
    expect(sniffImageMimeType(ascii("RIFF"))).toBeNull();
  });
});

describe("dataUrlToBlob", () => {
  test("decodes base64 data URLs", async () => {
    const blob = dataUrlToBlob("data:image/webp;base64,AQID");

    expect(blob?.type).toBe("image/webp");
    expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(bytes(1, 2, 3));
  });

  test("decodes plain data URLs", async () => {
    const blob = dataUrlToBlob("data:text/plain,hello%20world");

    expect(blob?.type).toBe("text/plain");
    expect(await blob?.text()).toBe("hello world");
  });

  test("returns null for malformed data URLs", () => {
    expect(dataUrlToBlob("not-a-data-url")).toBeNull();
    expect(dataUrlToBlob("data:image/webp;base64,%%%")).toBeNull();
  });
});
