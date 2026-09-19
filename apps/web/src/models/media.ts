import { z } from "zod";

export const MEDIA_REPLACE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const MEDIA_REPLACE_ACCEPT = MEDIA_REPLACE_MIME_TYPES.join(",");
export const MEDIA_REPLACE_MAX_BYTES = 5 * 1024 * 1024;

export const MEDIA_WEBP_QUALITY = 0.92;
export const MEDIA_THUMBNAIL_WIDTH = 20;
export const MEDIA_THUMBNAIL_QUALITY = 0.5;

export const MEDIA_ASPECT_RATIO_TOLERANCE = 0.01;

export const replacementFileSchema = z.object({
  type: z.enum(MEDIA_REPLACE_MIME_TYPES, {
    error: "Only PNG, JPEG and WebP images are supported",
  }),
  size: z
    .number()
    .positive({ error: "File is empty" })
    .max(MEDIA_REPLACE_MAX_BYTES, {
      error: `Image must be smaller than ${MEDIA_REPLACE_MAX_BYTES / 1024 / 1024}MB`,
    }),
});

export type ReplacementFileInput = { type: string; size: number };

export const validateReplacementFile = (file: ReplacementFileInput) =>
  replacementFileSchema.safeParse({ type: file.type, size: file.size });

export type ProcessedImage = {
  webpBlob: Blob;
  thumbnailBase64: string;
  width: number;
  height: number;
};

export type MediaLayout = {
  aspectRatio?: string;
  overlay?: { left: string; top: string };
};

export type MediaLayoutTarget = {
  clickX?: number;
  clickY?: number;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type MediaLayoutAsset = {
  width?: number | null;
  height?: number | null;
};
