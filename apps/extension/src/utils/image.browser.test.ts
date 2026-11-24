import { afterEach, describe, expect, test } from "vitest";

import { blobToBase64, blobToDataUrl, processScreenshot } from "./image";

const createSourceDataUrl = async (width: number, height: number): Promise<string> => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable");
  }
  context.fillStyle = "#3366ff";
  context.fillRect(0, 0, width, height);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(blob);
};

const readMagic = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return String.fromCharCode(...bytes);
};

const originalFileReader = globalThis.FileReader;

afterEach(() => {
  globalThis.FileReader = originalFileReader;
});

describe("image helpers", () => {
  test("encodes the capture and a thumbnail as WebP without decoding twice", async () => {
    const dataUrl = await createSourceDataUrl(40, 20);

    const result = await processScreenshot(dataUrl);

    expect(result.width).toBe(40);
    expect(result.height).toBe(20);
    expect(result.screenshotBlob.type).toBe("image/webp");
    expect(result.thumbnailBlob.type).toBe("image/webp");

    const magic = await readMagic(result.screenshotBlob);
    expect(magic.slice(0, 4)).toBe("RIFF");
    expect(magic.slice(8, 12)).toBe("WEBP");

    const thumbnailBitmap = await createImageBitmap(result.thumbnailBlob);
    expect(thumbnailBitmap.width).toBe(20);
    expect(thumbnailBitmap.height).toBe(10);
    thumbnailBitmap.close();
  });

  test("encodes base64 without FileReader", async () => {
    globalThis.FileReader = class {
      constructor() {
        throw new Error("FileReader must not be used");
      }
    } as unknown as typeof FileReader;

    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);

    await expect(blobToBase64(new Blob([bytes]))).resolves.toBe("AAEC/f7/");
  });

  test("round-trips base64 bytes", async () => {
    const bytes = new Uint8Array([82, 73, 70, 70, 0, 255, 128]);
    const encoded = await blobToBase64(new Blob([bytes]));
    const decoded = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));

    expect(decoded).toEqual(bytes);
  });

  test("builds a data URL from the blob mime type", async () => {
    await expect(blobToDataUrl(new Blob(["hello"], { type: "text/plain" }))).resolves.toBe(
      "data:text/plain;base64,aGVsbG8=",
    );
  });
});
