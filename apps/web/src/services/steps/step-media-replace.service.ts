import type {
  PresignUploadResponse,
  ReplaceUploadResponse,
} from "@repo/api-client";

import type { ProcessedImage } from "@/models";

type ReplaceStepMediaDeps = {
  presignUpload: (input: {
    guideId: string;
    stepId: string;
  }) => Promise<PresignUploadResponse>;
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
  ) => Promise<{ ok: boolean; status: number }>;
};

type ReplaceStepMediaInput = {
  stepId: string;
  guideId: string;
  file: File;
};

export const createReplaceStepMedia =
  ({
    presignUpload,
    replaceUpload,
    processImage,
    putObject,
  }: ReplaceStepMediaDeps) =>
  async ({
    stepId,
    guideId,
    file,
  }: ReplaceStepMediaInput): Promise<ReplaceUploadResponse> => {
    const { webpBlob, thumbnailBase64, width, height } =
      await processImage(file);

    const { presignedUrl, storagePath } = await presignUpload({
      guideId,
      stepId,
    });

    const putResponse = await putObject(presignedUrl, webpBlob, "image/webp");
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

export const putObjectWithFetch = async (
  url: string,
  body: Blob,
  contentType: string,
) => {
  const response = await fetch(url, {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });
  return { ok: response.ok, status: response.status };
};
