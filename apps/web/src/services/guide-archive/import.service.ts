import type {
  CreateGuideRequest,
  CreateMediaAssetRequest,
  CreateStepRequest,
  Guide,
  MediaAsset,
  PresignUploadRequest,
  PresignUploadResponse,
  Step,
  StepAction,
  StepCanvasContent,
  StepCanvasType,
  StepType,
} from "@repo/api-client";
import {
  GuideArchiveCanvasType,
  GuideArchiveError,
  GuideArchiveErrorCode,
  GuideArchiveStepType,
  GuideArchiveValue,
  type GuideArchiveAction,
  type GuideArchiveCanvasContent,
  type GuideArchiveContents,
  type GuideArchiveMedia,
} from "@repo/data-commons";

import {
  GUIDE_ARCHIVE_MESSAGES,
  GUIDE_ARCHIVE_UPLOAD_CONCURRENCY,
  GUIDE_ARCHIVE_UPLOAD_MAX_BYTES,
  getStepScreenshotWarning,
  isGuideArchiveFileTooLarge,
  isMediaSupportedOnStep,
  normalizeGuideArchiveTitle,
  type GuideArchiveImportProgress,
  type GuideArchiveImportResult,
} from "@/models";
import type { ProcessedImage } from "@/models";
import { dataUrlToBlob, sniffImageMimeType } from "@/utils/image.utils";

type PutObjectResult = { ok: boolean; status: number };

type ImportDeps = {
  parseArchive: (file: File, signal?: AbortSignal) => Promise<GuideArchiveContents>;
  createGuide: (data: CreateGuideRequest) => Promise<Guide>;
  createStep: (data: CreateStepRequest) => Promise<Step>;
  presignUpload: (data: PresignUploadRequest) => Promise<PresignUploadResponse>;
  putObject: (url: string, body: Blob, contentType: string) => Promise<PutObjectResult>;
  createMediaAsset: (data: CreateMediaAssetRequest) => Promise<MediaAsset>;
  processImage: (file: File, options?: { maxBytes?: number }) => Promise<ProcessedImage>;
  readDimensions: (blob: Blob) => Promise<{ width: number; height: number }>;
  now?: () => Date;
  randomUUID?: () => string;
};

type ImportInput = {
  file: File;
  teamId: string;
  signal?: AbortSignal;
  onProgress?: (progress: GuideArchiveImportProgress) => void;
};

type PendingMedia = {
  stepNumber: number;
  stepId: string;
  media: GuideArchiveMedia;
};

const stepTypeMap: Record<GuideArchiveStepType, StepType> = {
  [GuideArchiveStepType.Interaction]: "interaction",
  [GuideArchiveStepType.Canvas]: "canvas",
};

const canvasTypeMap: Record<GuideArchiveCanvasType, StepCanvasType> = {
  [GuideArchiveCanvasType.Header]: "header",
  [GuideArchiveCanvasType.Tip]: "tip",
  [GuideArchiveCanvasType.Callout]: "callout",
  [GuideArchiveCanvasType.Alert]: "alert",
  [GuideArchiveCanvasType.Code]: "code",
};

const actionMap: Record<GuideArchiveAction, StepAction> = {
  click: "click",
  input: "input",
  navigation: "navigation",
  keypress: "keypress",
};

const toCanvasContent = (content: GuideArchiveCanvasContent | null): StepCanvasContent | null =>
  content
    ? {
        type: canvasTypeMap[content.type],
        headingText: content.headingText,
        bodyText: content.bodyText,
        language: content.language,
        code: content.code,
        caption: content.caption,
      }
    : null;

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException("The operation was cancelled.", "AbortError");
  }
};

const mapWithConcurrency = async <T>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
) => {
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        await task(items[index], index);
      }
    }),
  );
};

export class GuideArchiveImportError extends Error {
  readonly guideId: string | null;
  readonly result: GuideArchiveImportResult | null;

  constructor(
    message: string,
    guideId: string | null,
    result: GuideArchiveImportResult | null,
    cause: unknown,
  ) {
    super(message, { cause });
    this.name = "GuideArchiveImportError";
    this.guideId = guideId;
    this.result = result;
  }
}

export const createGuideArchiveImport =
  (deps: ImportDeps) =>
  async ({ file, teamId, signal, onProgress }: ImportInput): Promise<GuideArchiveImportResult> => {
    if (isGuideArchiveFileTooLarge(file)) {
      throw new GuideArchiveError(GuideArchiveErrorCode.TooLarge, GUIDE_ARCHIVE_MESSAGES.tooLarge);
    }

    if (!teamId) {
      throw new Error(GUIDE_ARCHIVE_MESSAGES.noTeam);
    }

    const contents = await deps.parseArchive(file, signal);
    throwIfAborted(signal);

    const title = normalizeGuideArchiveTitle(
      contents.manifest.guide.title,
      deps.now?.() ?? new Date(),
    );
    const totalSteps = contents.manifest.steps.length;
    const createId = deps.randomUUID ?? (() => crypto.randomUUID());
    const warnings: string[] = [];
    const warn = (message: string) => {
      if (!warnings.includes(message)) {
        warnings.push(message);
      }
    };

    let guide: Guide;
    onProgress?.({ phase: "creating-guide", completed: 0, total: 1 });
    try {
      guide = await deps.createGuide({
        teamId,
        clientGuideId: createId(),
        title,
        description: contents.manifest.guide.description,
        metadata: contents.manifest.guide.metadata,
      });
    } catch (error) {
      throw new GuideArchiveImportError(
        error instanceof Error ? error.message : "The guide could not be created.",
        null,
        null,
        error,
      );
    }
    onProgress?.({ phase: "creating-guide", completed: 1, total: 1 });

    const pendingMedia: PendingMedia[] = [];
    let importedSteps = 0;
    let skippedMedia = 0;

    try {
      for (const [index, step] of contents.manifest.steps.entries()) {
        throwIfAborted(signal);

        const created = await deps.createStep({
          guideId: guide.id,
          clientStepId: createId(),
          type: stepTypeMap[step.type],
          action: step.action ? actionMap[step.action] : undefined,
          actionText: step.actionText,
          url: step.url,
          notes: step.notes,
          targetElement: step.targetElement,
          canvasContent: toCanvasContent(step.canvasContent),
        });

        importedSteps += 1;

        if (step.media.length > 0) {
          if (isMediaSupportedOnStep(step)) {
            pendingMedia.push(
              ...step.media.map((media) => ({
                stepNumber: index + 1,
                stepId: created.id,
                media,
              })),
            );
          } else {
            skippedMedia += step.media.length;
            warn(getStepScreenshotWarning(index + 1));
          }
        }

        onProgress?.({
          phase: "creating-steps",
          completed: index + 1,
          total: totalSteps,
        });
      }
    } catch (error) {
      throwIfAborted(signal);
      throw new GuideArchiveImportError(
        error instanceof Error ? error.message : "The guide steps could not be created.",
        guide.id,
        {
          guideId: guide.id,
          title,
          importedSteps,
          totalSteps,
          importedMedia: 0,
          skippedMedia: skippedMedia + pendingMedia.length,
          warnings,
          partial: true,
        },
        error,
      );
    }

    let importedMedia = 0;
    let uploadedMedia = 0;
    onProgress?.({ phase: "uploading-media", completed: 0, total: pendingMedia.length });

    await mapWithConcurrency(pendingMedia, GUIDE_ARCHIVE_UPLOAD_CONCURRENCY, async (item) => {
      throwIfAborted(signal);

      try {
        const bytes = contents.assets[item.media.assetPath];
        if (!bytes) {
          throw new Error("Screenshot is missing.");
        }

        const prepared = await prepareMedia(item.media, bytes, deps);
        const presigned = await deps.presignUpload({
          guideId: guide.id,
          stepId: item.stepId,
        });
        const uploaded = await deps.putObject(
          presigned.presignedUrl,
          prepared.blob,
          prepared.mimeType,
        );
        if (!uploaded.ok) {
          throw new Error(`Upload failed with status ${uploaded.status}`);
        }

        await deps.createMediaAsset({
          stepId: item.stepId,
          storagePath: presigned.storagePath,
          altText: item.media.altText,
          thumbnail: prepared.thumbnail,
          width: prepared.width,
          height: prepared.height,
          byteSize: prepared.blob.size,
          mimeType: prepared.mimeType,
        });
        importedMedia += 1;
      } catch {
        throwIfAborted(signal);
        skippedMedia += 1;
        warn(getStepScreenshotWarning(item.stepNumber));
      }

      uploadedMedia += 1;
      onProgress?.({
        phase: "uploading-media",
        completed: uploadedMedia,
        total: pendingMedia.length,
      });
    });

    return {
      guideId: guide.id,
      title,
      importedSteps,
      totalSteps,
      importedMedia,
      skippedMedia,
      warnings,
      partial: importedSteps < totalSteps || skippedMedia > 0,
    };
  };

type PreparedMedia = {
  blob: Blob;
  mimeType: string;
  thumbnail: string | null;
  width: number | null;
  height: number | null;
};

const createFallbackThumbnail = async (
  blob: Blob,
  deps: Pick<ImportDeps, "processImage">,
): Promise<string | null> => {
  try {
    const processed = await deps.processImage(
      new File([blob as unknown as BlobPart], "screenshot", {
        type: blob.type || GuideArchiveValue.WebpMimeType,
      }),
    );
    return processed.thumbnailBase64;
  } catch {
    return null;
  }
};

const resolveThumbnail = async (
  thumbnail: string | null,
  blob: Blob,
  deps: Pick<ImportDeps, "processImage" | "readDimensions">,
): Promise<string | null> => {
  if (thumbnail) {
    const thumbnailBlob = dataUrlToBlob(thumbnail);
    if (thumbnailBlob) {
      try {
        await deps.readDimensions(thumbnailBlob);
        return thumbnail;
      } catch {
        return createFallbackThumbnail(blob, deps);
      }
    }
  }

  return createFallbackThumbnail(blob, deps);
};

const prepareMedia = async (
  media: GuideArchiveMedia,
  bytes: Uint8Array,
  deps: Pick<ImportDeps, "processImage" | "readDimensions">,
): Promise<PreparedMedia> => {
  const actualMimeType = sniffImageMimeType(bytes);
  const isRawWebp =
    actualMimeType === GuideArchiveValue.WebpMimeType &&
    bytes.byteLength < GUIDE_ARCHIVE_UPLOAD_MAX_BYTES;

  if (isRawWebp) {
    const blob = new Blob([bytes as unknown as BlobPart], {
      type: GuideArchiveValue.WebpMimeType,
    });
    const dimensions = await deps.readDimensions(blob);

    return {
      blob,
      mimeType: GuideArchiveValue.WebpMimeType,
      thumbnail: await resolveThumbnail(media.thumbnail, blob, deps),
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  const file = new File([bytes as unknown as BlobPart], "screenshot", {
    type: actualMimeType ?? media.mimeType ?? GuideArchiveValue.WebpMimeType,
  });
  const processed = await deps.processImage(file, {
    maxBytes: GUIDE_ARCHIVE_UPLOAD_MAX_BYTES,
  });

  if (processed.webpBlob.size >= GUIDE_ARCHIVE_UPLOAD_MAX_BYTES) {
    throw new Error("Screenshot is too large.");
  }

  return {
    blob: processed.webpBlob,
    mimeType: GuideArchiveValue.WebpMimeType,
    thumbnail: processed.thumbnailBase64,
    width: processed.width,
    height: processed.height,
  };
};

export type GuideArchiveImport = ReturnType<typeof createGuideArchiveImport>;
