import { useLiveQuery } from "dexie-react-hooks";

import { useBlobObjectUrls } from "./useObjectUrl";
import { type LocalBlob, type LocalStep, type StepJobProgress, toStepJobProgress } from "@/models";
import { db, outboxRepository } from "@/services/outbox";

type SessionStepsRows = {
  steps: LocalStep[];
  blobs: LocalBlob[];
};

const emptySteps: LocalStep[] = [];
const emptyBlobs: LocalBlob[] = [];

const loadSessionSteps = async (sessionId: string | undefined): Promise<SessionStepsRows> => {
  if (!sessionId) {
    return { steps: emptySteps, blobs: emptyBlobs };
  }

  const steps = await outboxRepository.listSteps(sessionId);
  const blobIds = steps.flatMap((step) => {
    const ids: string[] = [];
    if (step.screenshotBlobId !== undefined) {
      ids.push(step.screenshotBlobId);
    }
    if (step.thumbnailBlobId !== undefined) {
      ids.push(step.thumbnailBlobId);
    }
    return ids;
  });

  if (blobIds.length === 0) {
    return { steps, blobs: emptyBlobs };
  }

  const storedBlobs = await db.blobs.bulkGet(blobIds);
  const blobs = storedBlobs.filter((blob): blob is LocalBlob => blob !== undefined);

  return { steps, blobs };
};

export type SessionStepsResult = {
  steps: LocalStep[];
  progress: StepJobProgress[];
  isLoading: boolean;
};

/**
 * Pending steps render from Dexie with object URLs. Synced steps keep their
 * server screenshot URL because the full blob is pruned on sync.
 */
export const useSessionSteps = (sessionId: string | undefined): SessionStepsResult => {
  const rows = useLiveQuery(() => loadSessionSteps(sessionId), [sessionId]);
  const blobs = rows?.blobs ?? emptyBlobs;
  const urls = useBlobObjectUrls(blobs);
  const steps = rows?.steps ?? emptySteps;

  const progress = steps.flatMap((step) => {
    const progress = toStepJobProgress(step, {
      screenshotUrl: step.screenshotBlobId !== undefined ? urls[step.screenshotBlobId] : undefined,
      thumbnail: step.thumbnailBlobId !== undefined ? urls[step.thumbnailBlobId] : undefined,
    });

    return progress ? [progress] : [];
  });

  return { steps, progress, isLoading: rows === undefined };
};
