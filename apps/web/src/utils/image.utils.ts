import { GuideArchiveValue } from "@repo/data-commons";

import {
  MEDIA_THUMBNAIL_QUALITY,
  MEDIA_THUMBNAIL_WIDTH,
  MEDIA_WEBP_QUALITY,
  type ProcessedImage,
} from "@/models";

export type SniffedImageMimeType =
  | typeof GuideArchiveValue.WebpMimeType
  | typeof GuideArchiveValue.PngMimeType
  | typeof GuideArchiveValue.JpegMimeType;

const asciiAt = (bytes: Uint8Array, offset: number, value: string) =>
  value.split("").every((character, index) => bytes[offset + index] === character.charCodeAt(0));

export const sniffImageMimeType = (bytes: Uint8Array): SniffedImageMimeType | null => {
  if (bytes.byteLength >= 12 && asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WEBP")) {
    return GuideArchiveValue.WebpMimeType;
  }

  if (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return GuideArchiveValue.PngMimeType;
  }

  if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return GuideArchiveValue.JpegMimeType;
  }

  return null;
};

export const dataUrlToBlob = (dataUrl: string): Blob | null => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) {
    return null;
  }

  const [, mimeType = "application/octet-stream", isBase64, data] = match;

  try {
    const bytes = isBase64
      ? Uint8Array.from(atob(data), (character) => character.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(data));

    return new Blob([bytes as unknown as BlobPart], { type: mimeType });
  } catch {
    return null;
  }
};

const assertBrowser = () => {
  if (typeof window === "undefined") {
    throw new Error("Image processing is only available in the browser");
  }
};

const drawToBlob = (
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> => {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/webp", quality });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
      "image/webp",
      quality,
    );
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });

type ProcessImageOptions = {
  maxBytes?: number;
};

export const processImageFileForUpload = async (
  file: File,
  { maxBytes }: ProcessImageOptions = {},
): Promise<ProcessedImage> => {
  assertBrowser();

  const bitmap = await createImageBitmap(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    let webpBlob = await drawToBlob(bitmap, width, height, MEDIA_WEBP_QUALITY);

    while (maxBytes && webpBlob.size > maxBytes && width > 16 && height > 16) {
      width = Math.max(16, Math.round(width * 0.8));
      height = Math.max(16, Math.round(height * 0.8));
      webpBlob = await drawToBlob(bitmap, width, height, MEDIA_WEBP_QUALITY);
    }

    const thumbHeight = Math.max(1, Math.round(MEDIA_THUMBNAIL_WIDTH * (height / width)));
    const thumbnailBlob = await drawToBlob(
      bitmap,
      MEDIA_THUMBNAIL_WIDTH,
      thumbHeight,
      MEDIA_THUMBNAIL_QUALITY,
    );

    return {
      webpBlob,
      thumbnailBase64: await blobToDataUrl(thumbnailBlob),
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
};

export const readImageDimensions = async (
  blob: Blob,
): Promise<{ width: number; height: number }> => {
  assertBrowser();

  const bitmap = await createImageBitmap(blob);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
};
