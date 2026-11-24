import { THUMBNAIL_QUALITY, THUMBNAIL_WIDTH, WEBP_QUALITY } from "./constants";
import type { ProcessedScreenshot } from "@/models";

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header = "", data = ""] = dataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const byteString = atob(data);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const BASE64_CHUNK_SIZE = 0x8000;

/**
 * Worker-safe base64. FileReader exists in modern workers but is slower and is
 * not guaranteed on the Chrome 114 floor, so encode the bytes directly.
 */
export const blobToBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_SIZE));
  }
  return btoa(binary);
};

export const blobToDataUrl = async (blob: Blob): Promise<string> =>
  `data:${blob.type || "application/octet-stream"};base64,${await blobToBase64(blob)}`;

type ProcessScreenshotOptions = {
  quality?: number;
  thumbnailWidth?: number;
  thumbnailQuality?: number;
};

/**
 * Decodes the capture once and produces both stored blobs from the same
 * bitmap. IndexedDB keeps the full screenshot until sync; the thumbnail is
 * kept for the panel and the API.
 */
export const processScreenshot = async (
  dataUrl: string,
  {
    quality = WEBP_QUALITY,
    thumbnailWidth = THUMBNAIL_WIDTH,
    thumbnailQuality = THUMBNAIL_QUALITY,
  }: ProcessScreenshotOptions = {},
): Promise<ProcessedScreenshot> => {
  const bitmap = await createImageBitmap(dataUrlToBlob(dataUrl));
  const { width, height } = bitmap;

  try {
    const screenshotCanvas = new OffscreenCanvas(width, height);
    const screenshotContext = screenshotCanvas.getContext("2d");
    if (!screenshotContext) {
      throw new Error("OffscreenCanvas 2D context is unavailable");
    }
    screenshotContext.drawImage(bitmap, 0, 0);
    const screenshotBlob = await screenshotCanvas.convertToBlob({
      type: "image/webp",
      quality,
    });

    const thumbnailHeight = Math.max(1, Math.round((thumbnailWidth * height) / width));
    const thumbnailCanvas = new OffscreenCanvas(thumbnailWidth, thumbnailHeight);
    const thumbnailContext = thumbnailCanvas.getContext("2d");
    if (!thumbnailContext) {
      throw new Error("OffscreenCanvas 2D context is unavailable");
    }
    thumbnailContext.drawImage(bitmap, 0, 0, thumbnailWidth, thumbnailHeight);
    const thumbnailBlob = await thumbnailCanvas.convertToBlob({
      type: "image/webp",
      quality: thumbnailQuality,
    });

    return { screenshotBlob, thumbnailBlob, width, height };
  } finally {
    bitmap.close();
  }
};

/**
 * Kept for the offscreen upload path until Agent I removes it. New capture
 * code uses `processScreenshot` so the bitmap is decoded exactly once.
 */
export const compressToWebP = async (dataUrl: string, quality = WEBP_QUALITY): Promise<Blob> =>
  (await processScreenshot(dataUrl, { quality })).screenshotBlob;

/**
 * Kept for the offscreen upload path until Agent I removes it.
 */
export const generateThumbnail = async (
  dataUrl: string,
  width = THUMBNAIL_WIDTH,
  quality = THUMBNAIL_QUALITY,
): Promise<string> =>
  blobToBase64(
    (await processScreenshot(dataUrl, { thumbnailWidth: width, thumbnailQuality: quality }))
      .thumbnailBlob,
  );

/**
 * Kept for the offscreen upload path until Agent I removes it.
 */
export const processScreenshotForUpload = async (
  dataUrl: string,
): Promise<{ webpBlob: Blob; thumbnailBase64: string; width: number; height: number }> => {
  const { screenshotBlob, thumbnailBlob, width, height } = await processScreenshot(dataUrl);
  return {
    webpBlob: screenshotBlob,
    thumbnailBase64: await blobToBase64(thumbnailBlob),
    width,
    height,
  };
};
