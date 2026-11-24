import { ApiError, type CreateStepRequest } from "@repo/api-client";

import type { OutboxStepStateRepository } from "./outbox-step-state.repository";
import type { OutboxRepository } from "./outbox.repository";
import type { LocalSession, LocalStep, OutboxApi, RecordingLifecycleStore } from "@/models";
import { RECORDING_PENDING_START_TTL_MS } from "@/utils/constants";
import { blobToBase64 } from "@/utils/image";

export type OutboxFailureKind = "auth" | "guide-gone";

const AUTH_STATUSES = [401, 403];
const GUIDE_GONE_STATUSES = [404, 409];

/**
 * A failure the drainer must not retry: the session is signed out or the guide
 * no longer exists on the server. Everything else is transient.
 */
export class OutboxPermanentError extends Error {
  readonly kind: OutboxFailureKind;

  constructor(kind: OutboxFailureKind, message: string) {
    super(message);
    this.name = "OutboxPermanentError";
    this.kind = kind;
  }
}

export const isAuthError = (error: unknown): boolean =>
  error instanceof ApiError && AUTH_STATUSES.includes(error.status);

export const classifyOutboxError = (error: unknown): OutboxFailureKind | null => {
  if (error instanceof OutboxPermanentError) {
    return error.kind;
  }

  if (error instanceof ApiError) {
    if (AUTH_STATUSES.includes(error.status)) {
      return "auth";
    }
    if (GUIDE_GONE_STATUSES.includes(error.status)) {
      return "guide-gone";
    }
  }

  return null;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

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
  repository: OutboxRepository;
  stepState: OutboxStepStateRepository;
  lifecycleStore: RecordingLifecycleStore;
  api: OutboxApi;
  getActiveTeamId: () => Promise<string | undefined>;
  thumbnailToBase64?: (blob: Blob) => Promise<string>;
  measureImage?: (blob: Blob) => Promise<{ width: number; height: number } | undefined>;
  now?: () => Date;
};

export type PushStepInput = {
  step: LocalStep;
  guideId: string;
  insertAfterStepId?: string;
};

/**
 * Turns one local step into a server step plus its screenshot.
 *
 * Every write that matters happens in an order that survives a killed worker:
 * `serverStepId` is persisted before the upload, and a step that already has a
 * `serverStepId` skips the create so the replay path cannot duplicate it.
 */
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
      throw new Error("Local session has no guide to upload to");
    }

    const teamId = (await getActiveTeamId()) ?? "";

    try {
      const guide = await api.createGuide({
        title: guideTitleForSession(session),
        teamId,
        clientGuideId: session.clientGuideId,
      });
      await repository.setSessionGuideId(session.id, guide.id);
      return guide.id;
    } catch (error) {
      if (isAuthError(error)) {
        throw error;
      }
      throw new Error(`Failed to create guide: ${toError(error).message}`);
    }
  };

  const uploadScreenshot = async (
    step: LocalStep,
    serverStepId: string,
    guideId: string,
  ): Promise<string | undefined> => {
    const screenshot = step.screenshotBlobId
      ? await repository.getBlob(step.screenshotBlobId)
      : undefined;

    if (!screenshot) {
      return undefined;
    }

    const thumbnail = step.thumbnailBlobId
      ? await repository.getBlob(step.thumbnailBlobId)
      : undefined;

    const presign = await api.presignUpload({ stepId: serverStepId, guideId });
    await api.uploadBlob(presign.presignedUrl, screenshot.blob);

    const dimensions = await measureImage(screenshot.blob);
    const replace = await api.replaceUpload({
      stepId: serverStepId,
      storagePath: presign.storagePath,
      fileSize: screenshot.blob.size,
      ...(thumbnail ? { thumbnail: await thumbnailToBase64(thumbnail.blob) } : {}),
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
      const created = await api.createStep({
        guideId,
        clientStepId: step.id,
        action: step.action,
        url: step.url,
        ...(step.actionText !== undefined ? { actionText: step.actionText } : {}),
        ...(step.targetElement !== undefined
          ? {
              targetElement: step.targetElement as CreateStepRequest["targetElement"],
            }
          : {}),
        ...(insertAfterStepId !== undefined ? { insertAfterStepId } : {}),
      });

      serverStepId = created.id;
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
