import type { Guide, MediaAsset, Step } from "@repo/api-client";
import {
  GuideArchiveAction,
  GuideArchiveCanvasType,
  GuideArchiveStepType,
  GuideArchiveValue,
  buildGuideArchiveFileName,
  computeSha256Hex,
  createGuideArchiveAssetPath,
  type GuideArchiveManifest,
  type GuideArchiveMedia,
  type GuideArchiveStep,
} from "@repo/data-commons";

import {
  GUIDE_ARCHIVE_APP_NAME,
  GUIDE_ARCHIVE_APP_VERSION,
  GUIDE_ARCHIVE_UPLOAD_CONCURRENCY,
  type GuideArchiveExportFailure,
  type GuideArchiveProgress,
} from "@/models";

export class GuideArchiveExportError extends Error {
  readonly failures: GuideArchiveExportFailure[];

  constructor(failures: GuideArchiveExportFailure[]) {
    super("Some screenshots could not be fetched.");
    this.name = "GuideArchiveExportError";
    this.failures = failures;
  }
}

type ExportDeps = {
  fetchSteps: (guideId: string, signal?: AbortSignal) => Promise<Step[]>;
  fetchAsset: (
    url: string,
    signal?: AbortSignal,
  ) => Promise<{ bytes: Uint8Array; mimeType: string }>;
  pack: (
    manifest: GuideArchiveManifest,
    assets: Record<string, Uint8Array>,
    signal?: AbortSignal,
  ) => Promise<Uint8Array>;
  now?: () => Date;
};

type ExportInput = {
  guide: Pick<Guide, "id" | "title" | "description" | "metadata">;
  downloadWithoutMissingScreenshots?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: GuideArchiveProgress) => void;
};

type ExportResult = {
  bytes: Uint8Array;
  fileName: string;
  skipped: GuideArchiveExportFailure[];
};

const stepTypeMap: Record<Step["type"], GuideArchiveStepType> = {
  interaction: GuideArchiveStepType.Interaction,
  canvas: GuideArchiveStepType.Canvas,
};

const canvasTypeMap: Record<NonNullable<Step["canvasContent"]>["type"], GuideArchiveCanvasType> = {
  header: GuideArchiveCanvasType.Header,
  tip: GuideArchiveCanvasType.Tip,
  callout: GuideArchiveCanvasType.Callout,
  alert: GuideArchiveCanvasType.Alert,
  code: GuideArchiveCanvasType.Code,
};

const actionMap: Record<NonNullable<Step["action"]>, GuideArchiveAction> = {
  click: GuideArchiveAction.Click,
  input: GuideArchiveAction.Input,
  navigation: GuideArchiveAction.Navigation,
  keypress: GuideArchiveAction.Keypress,
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException("The operation was cancelled.", "AbortError");
  }
};

const toStepExport = (step: Step, media: GuideArchiveMedia[]): GuideArchiveStep => {
  const isCanvas = step.type === "canvas";

  return {
    type: stepTypeMap[step.type],
    action: !isCanvas && step.action ? actionMap[step.action] : null,
    actionText: isCanvas ? null : (step.actionText ?? null),
    url: isCanvas ? null : (step.url ?? null),
    notes: step.notes ?? null,
    targetElement: isCanvas ? null : (step.targetElement ?? null),
    canvasContent:
      isCanvas && step.canvasContent
        ? {
            type: canvasTypeMap[step.canvasContent.type],
            headingText: step.canvasContent.headingText ?? null,
            bodyText: step.canvasContent.bodyText ?? null,
            language: step.canvasContent.language ?? null,
            code: step.canvasContent.code ?? null,
            caption: step.canvasContent.caption ?? null,
          }
        : null,
    media,
  };
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

type MediaTask = {
  stepIndex: number;
  mediaIndex: number;
  stepNumber: number;
  media: MediaAsset;
};

export const createGuideArchiveExport =
  ({ fetchSteps, fetchAsset, pack, now = () => new Date() }: ExportDeps) =>
  async ({
    guide,
    downloadWithoutMissingScreenshots = false,
    signal,
    onProgress,
  }: ExportInput): Promise<ExportResult> => {
    const steps = await fetchSteps(guide.id, signal);
    const exportedAt = now();

    const tasks: MediaTask[] = steps.flatMap((step, stepIndex) =>
      (step.mediaAssets ?? []).map((media, mediaIndex) => ({
        stepIndex,
        mediaIndex,
        stepNumber: stepIndex + 1,
        media,
      })),
    );

    const assets: Record<string, Uint8Array> = {};
    const skipped: GuideArchiveExportFailure[] = [];
    const mediaByStep: (GuideArchiveMedia | null)[][] = steps.map((step) =>
      (step.mediaAssets ?? []).map(() => null),
    );
    let completed = 0;

    onProgress?.({ phase: "fetching", completed, total: tasks.length });

    await mapWithConcurrency(tasks, GUIDE_ARCHIVE_UPLOAD_CONCURRENCY, async (task) => {
      throwIfAborted(signal);

      try {
        if (!task.media.url) {
          throw new Error("Screenshot URL is missing.");
        }

        const fetched = await fetchAsset(task.media.url, signal);
        const mimeType = task.media.mimeType || fetched.mimeType || GuideArchiveValue.WebpMimeType;
        const assetPath = createGuideArchiveAssetPath(mimeType, exportedAt.getTime() + completed);

        assets[assetPath] = fetched.bytes;
        mediaByStep[task.stepIndex][task.mediaIndex] = {
          assetPath,
          mimeType,
          altText: task.media.altText ?? null,
          thumbnail: task.media.thumbnail ?? null,
          width: task.media.width ?? null,
          height: task.media.height ?? null,
          byteSize: fetched.bytes.byteLength,
          sha256: await computeSha256Hex(fetched.bytes),
        };
      } catch (error) {
        throwIfAborted(signal);
        skipped.push({
          stepNumber: task.stepNumber,
          message: error instanceof Error ? error.message : "Screenshot could not be fetched.",
        });
      }

      completed += 1;
      onProgress?.({ phase: "fetching", completed, total: tasks.length });
    });

    if (skipped.length > 0 && !downloadWithoutMissingScreenshots) {
      throw new GuideArchiveExportError(skipped);
    }

    const exportedSteps = steps.map((step, stepIndex) =>
      toStepExport(
        step,
        mediaByStep[stepIndex].filter((media): media is GuideArchiveMedia => media !== null),
      ),
    );

    const manifest: GuideArchiveManifest = {
      format: GuideArchiveValue.Format,
      schemaVersion: 1,
      exportedAt: exportedAt.toISOString(),
      app: { name: GUIDE_ARCHIVE_APP_NAME, version: GUIDE_ARCHIVE_APP_VERSION },
      guide: {
        title: guide.title,
        description: guide.description ?? null,
        metadata: guide.metadata ?? null,
      },
      steps: exportedSteps,
    };

    throwIfAborted(signal);
    onProgress?.({ phase: "packing", completed: 0, total: 1 });
    const bytes = await pack(manifest, assets, signal);
    onProgress?.({ phase: "packing", completed: 1, total: 1 });

    return {
      bytes,
      fileName: buildGuideArchiveFileName(guide.title, exportedAt),
      skipped,
    };
  };

export type GuideArchiveExport = ReturnType<typeof createGuideArchiveExport>;
