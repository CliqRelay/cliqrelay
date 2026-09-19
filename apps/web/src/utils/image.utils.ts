import {
  MEDIA_THUMBNAIL_QUALITY,
  MEDIA_THUMBNAIL_WIDTH,
  MEDIA_WEBP_QUALITY,
  type ProcessedImage,
} from "@/models";

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
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Failed to encode image")),
      "image/webp",
      quality,
    );
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });

export const processImageFileForUpload = async (
  file: File,
): Promise<ProcessedImage> => {
  assertBrowser();

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const thumbHeight = Math.max(
      1,
      Math.round(MEDIA_THUMBNAIL_WIDTH * (height / width)),
    );

    const [webpBlob, thumbnailBlob] = await Promise.all([
      drawToBlob(bitmap, width, height, MEDIA_WEBP_QUALITY),
      drawToBlob(
        bitmap,
        MEDIA_THUMBNAIL_WIDTH,
        thumbHeight,
        MEDIA_THUMBNAIL_QUALITY,
      ),
    ]);

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
