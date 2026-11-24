import { ApiError } from "@repo/api-client";

import { OutboxPermanentError } from "./outbox-api.service";
import type { OutboxStepStateRepository } from "./outbox-step-state.repository";
import type { OutboxRepository } from "./outbox.repository";
import type {
  LocalBlob,
  LocalSession,
  LocalStep,
  OutboxApi,
  OutboxFailureKind,
  PushStepInput,
  RecordingLifecycleStore,
} from "@/models";
import { RECORDING_PENDING_START_TTL_MS } from "@/utils/constants";
import { blobToBase64 } from "@/utils/image";

const AUTH_STATUSES = [401, 403];
const GUIDE_GONE_STATUSES = [404, 409];

export const classifyOutboxError = (error: unknown): OutboxFailureKind | null => {
  if (error instanceof OutboxPermanentError) {
    return error.kind;
  }

  if (!(error instanceof ApiError)) {
    return null;
  }

  if (AUTH_STATUSES.includes(error.status)) {
    return "auth";
  }

  if (GUIDE_GONE_STATUSES.includes(error.status)) {
    return "guide-gone";
  }

  return null;
};

const guideTitleForSession = (session: LocalSession): string => {
  const startedAt = Date.parse(session.startedAt);
  return Number.isNaN(startedAt) ? `guide-${session.clientGuideId}` : `guide-${startedAt}`;
};

const measureBlob = async (blob: Blob): Promise<{ width: number; height: number } | undefined> => {
  try {
    const bitmap = await createImageBitmap(blob);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  } catch {
    return undefined;
  }
};

type OutboxPusherDeps = {
  repository: Pick<
    OutboxRepository,
    "markStepUploading" | "markStepSynced" | "setSessionGuideId"
  > & {
    getBlob: (id: string) => Promise<LocalBlob | undefined>;
  };
  stepState: Pick<OutboxStepStateRepository, "setServerStepId" | "setServerScreenshotUrl">;
  lifecycleStore: Pick<RecordingLifecycleStore, "get">;
  api: OutboxApi;
  getActiveTeamId: () => Promise<string | undefined>;
  thumbnailToBase64?: (blob: Blob) => Promise<string>;
  measureImage?: (blob: Blob) => Promise<{ width: number; height: number } | undefined>;
  now?: () => Date;
};

export const createOutboxPusher = ({
  repository,
  stepState,
  lifecycleStore,
  api,
  getActiveTeamId,
  thumbnailToBase64 = blobToBase64,
  measureImage = measureBlob,
  now = () => new Date(),
}: OutboxPusherDeps) => {
  const hasFreshPendingStart = async (): Promise<boolean> => {
    const { pendingStart } = await lifecycleStore.get();
    if (!pendingStart) {
      return false;
    }

    const startedAt = Date.parse(pendingStart.startedAt);
    return (
      !Number.isNaN(startedAt) && now().getTime() - startedAt <= RECORDING_PENDING_START_TTL_MS
    );
  };

  const ensureGuide = async (session: LocalSession): Promise<string> => {
    if (session.guideId) {
      return session.guideId;
    }

    if (!(await hasFreshPendingStart())) {
      throw new OutboxPermanentError("guide-required", "Local session has no guide to upload to");
    }

    const guide = await api.createGuide({
      title: guideTitleForSession(session),
      teamId: (await getActiveTeamId()) ?? "",
      clientGuideId: session.clientGuideId,
    });
    await repository.setSessionGuideId(session.id, guide.id);
    return guide.id;
  };

  const uploadScreenshot = async (
    step: LocalStep,
    serverStepId: string,
    guideId: string,
  ): Promise<string | undefined> => {
    const [screenshot, thumbnail, presign] = await Promise.all([
      step.screenshotBlobId ? repository.getBlob(step.screenshotBlobId) : undefined,
      step.thumbnailBlobId ? repository.getBlob(step.thumbnailBlobId) : undefined,
      step.screenshotBlobId
        ? api.presignUpload({ stepId: serverStepId, guideId })
        : Promise.resolve(undefined),
    ]);

    if (!screenshot || !presign) {
      return undefined;
    }

    await api.uploadBlob(presign.presignedUrl, screenshot.blob);

    const [dimensions, thumbnailBase64] = await Promise.all([
      measureImage(screenshot.blob),
      thumbnail ? thumbnailToBase64(thumbnail.blob) : undefined,
    ]);

    const replace = await api.replaceUpload({
      stepId: serverStepId,
      storagePath: presign.storagePath,
      fileSize: screenshot.blob.size,
      ...(thumbnailBase64 !== undefined ? { thumbnail: thumbnailBase64 } : {}),
      ...dimensions,
    });

    if (replace.url) {
      await stepState.setServerScreenshotUrl(step.id, replace.url, now());
    }

    return replace.url || undefined;
  };

  const pushStep = async ({ step, guideId, insertAfterStepId }: PushStepInput): Promise<void> => {
    await repository.markStepUploading(step.id, now());

    let serverStepId = step.serverStepId;
    if (!serverStepId) {
      try {
        const created = await api.createStep({
          guideId,
          clientStepId: step.id,
          action: step.action,
          url: step.url,
          ...(step.actionText !== undefined ? { actionText: step.actionText } : {}),
          ...(step.targetElement !== undefined ? { targetElement: step.targetElement } : {}),
          ...(insertAfterStepId !== undefined ? { insertAfterStepId } : {}),
        });

        serverStepId = created.id;
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          throw new OutboxPermanentError(
            "step-conflict",
            `Step ${step.id} conflicts with its server copy`,
          );
        }
        throw error;
      }

      await stepState.setServerStepId(step.id, serverStepId, now());
    }

    const serverScreenshotUrl =
      step.serverScreenshotUrl ?? (await uploadScreenshot(step, serverStepId, guideId));

    await repository.markStepSynced(step.id, {
      serverStepId,
      ...(serverScreenshotUrl ? { serverScreenshotUrl } : {}),
      now: now(),
    });
  };

  return { ensureGuide, pushStep };
};

export type OutboxPusher = ReturnType<typeof createOutboxPusher>;
