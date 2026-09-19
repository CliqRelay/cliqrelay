import type { PresignUploadResponse, ReplaceUploadResponse } from "@repo/api-client";

import type { ProcessedImage } from "@/models";

type ReplaceStepMediaDeps = {
  presignUpload: (input: { guideId: string; stepId: string }) => Promise<PresignUploadResponse>;
  replaceUpload: (input: {
    stepId: string;
    storagePath: string;
    fileSize: number;
    mimeType: string;
    thumbnail: string;
    width: number;
    height: number;
  }) => Promise<ReplaceUploadResponse>;
  processImage: (file: File) => Promise<ProcessedImage>;
  putObject: (
    url: string,
    body: Blob,
    contentType: string,
    onProgress?: UploadProgressHandler,
  ) => Promise<PutObjectResult>;
};

export type UploadProgressHandler = (fraction: number) => void;

type PutObjectResult = { ok: boolean; status: number };

type ReplaceStepMediaInput = {
  stepId: string;
  guideId: string;
  file: File;
  onProgress?: UploadProgressHandler;
};

export const createReplaceStepMedia =
  ({ presignUpload, replaceUpload, processImage, putObject }: ReplaceStepMediaDeps) =>
  async ({
    stepId,
    guideId,
    file,
    onProgress,
  }: ReplaceStepMediaInput): Promise<ReplaceUploadResponse> => {
    const { webpBlob, thumbnailBase64, width, height } = await processImage(file);

    const { presignedUrl, storagePath } = await presignUpload({
      guideId,
      stepId,
    });

    const putResponse = await putObject(presignedUrl, webpBlob, "image/webp", onProgress);
    if (!putResponse.ok) {
      throw new Error(`Upload failed with status ${putResponse.status}`);
    }

    return replaceUpload({
      stepId,
      storagePath,
      fileSize: webpBlob.size,
      mimeType: "image/webp",
      thumbnail: thumbnailBase64,
      width,
      height,
    });
  };

export const putObjectWithXhr = (
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: UploadProgressHandler,
) =>
  new Promise<PutObjectResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () =>
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
      });
    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(body);
  });
