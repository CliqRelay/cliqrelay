import Dexie from "dexie";

import type {
  AppendStepInput,
  AppendStepWithBlobsInput,
  CaptureBlobsInput,
  CreateSessionInput,
  DateInput,
  ListSyncableStepsScope,
  LocalBlob,
  LocalBlobKind,
  LocalSession,
  LocalStep,
  MarkStepSyncedInput,
  OutboxCleanupResult,
  OutboxCounts,
  PutBlobInput,
  StepDeletionOutcome,
  SyncStatus,
  UpdateSessionInput,
  UpsertTypingStepInput,
} from "@/models";
import { outboxRetention, syncStatusValues } from "@/models";
import type { OutboxDatabase } from "@/services/db";

const syncableStatuses: SyncStatus[] = ["pending", "uploading", "failed"];

const toIso = (value: DateInput): string =>
  typeof value === "string" ? value : value.toISOString();

const isTerminal = (status: LocalStep["syncStatus"]) => status === "synced" || status === "deleted";

export const createOutboxRepository = (db: OutboxDatabase) => {
  const allocateAndInsertStep = async (input: AppendStepInput): Promise<LocalStep> => {
    const session = await db.sessions.get(input.sessionId);

    if (!session) {
      throw new Error(`Outbox session not found: ${input.sessionId}`);
    }

    const now = toIso(input.now ?? new Date());
    const step: LocalStep = {
      id: input.id ?? crypto.randomUUID(),
      sessionId: input.sessionId,
      guideId: input.guideId === undefined ? session.guideId : input.guideId,
      stepIndex: session.nextStepIndex,
      kind: input.kind,
      action: input.action,
      url: input.url,
      capturedAt: toIso(input.capturedAt),
      syncStatus: "pending",
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (input.actionText !== undefined) {
      step.actionText = input.actionText;
    }
    if (input.targetElement !== undefined) {
      step.targetElement = input.targetElement;
    }
    if (input.typingSessionId !== undefined) {
      step.typingSessionId = input.typingSessionId;
    }
    if (input.screenshotBlobId !== undefined) {
      step.screenshotBlobId = input.screenshotBlobId;
    }
    if (input.thumbnailBlobId !== undefined) {
      step.thumbnailBlobId = input.thumbnailBlobId;
    }

    await db.sessions.update(session.id, {
      nextStepIndex: session.nextStepIndex + 1,
      lastActivityAt: now,
    });
    await db.steps.add(step);

    return step;
  };

  const appendStep = (input: AppendStepInput): Promise<LocalStep> =>
    db.transaction("rw", db.sessions, db.steps, () => allocateAndInsertStep(input));

  const upsertTypingStep = (input: UpsertTypingStepInput): Promise<LocalStep> =>
    db.transaction("rw", db.sessions, db.steps, async () => {
      const existing = await db.steps
        .where("[sessionId+typingSessionId]")
        .equals([input.sessionId, input.typingSessionId])
        .first();

      if (!existing) {
        return allocateAndInsertStep(input);
      }

      const now = toIso(input.now ?? new Date());
      const changes: Partial<LocalStep> = {
        action: input.action,
        url: input.url,
        capturedAt: toIso(input.capturedAt),
        updatedAt: now,
      };

      if (input.actionText !== undefined) {
        changes.actionText = input.actionText;
      }
      if (input.targetElement !== undefined) {
        changes.targetElement = input.targetElement;
      }
      if (input.guideId !== undefined) {
        changes.guideId = input.guideId;
      }

      await db.steps.update(existing.id, changes);
      await db.sessions.update(input.sessionId, { lastActivityAt: now });

      return { ...existing, ...changes };
    });

  const appendStepWithBlobs = (
    input: AppendStepWithBlobsInput,
    blobs: CaptureBlobsInput,
  ): Promise<LocalStep> =>
    db.transaction("rw", db.sessions, db.steps, db.blobs, async () => {
      const now = input.now ?? new Date();
      const screenshotBlobId = crypto.randomUUID();
      const thumbnailBlobId = crypto.randomUUID();
      const step = await allocateAndInsertStep({
        ...input,
        now,
        screenshotBlobId,
        thumbnailBlobId,
      });
      const createdAt = toIso(now);

      await db.blobs.bulkAdd([
        {
          id: screenshotBlobId,
          stepId: step.id,
          kind: "screenshot",
          blob: blobs.screenshot,
          createdAt,
        },
        {
          id: thumbnailBlobId,
          stepId: step.id,
          kind: "thumbnail",
          blob: blobs.thumbnail,
          createdAt,
        },
      ]);

      return step;
    });

  const listTypingSteps = (sessionId: string): Promise<LocalStep[]> =>
    db.steps
      .where("[sessionId+typingSessionId]")
      .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
      .sortBy("stepIndex");

  const findTypingStep = (sessionId: string, typingSessionId: string) =>
    db.steps.where("[sessionId+typingSessionId]").equals([sessionId, typingSessionId]).first();

  const deleteTypingStep = (sessionId: string, typingSessionId: string): Promise<boolean> =>
    db.transaction("rw", db.steps, db.blobs, async () => {
      const step = await findTypingStep(sessionId, typingSessionId);

      if (!step) {
        return false;
      }

      await deleteStepRecords([step.id]);
      return true;
    });

  const createSession = async (input: CreateSessionInput): Promise<LocalSession> => {
    const id = input.id ?? crypto.randomUUID();
    const startedAt = toIso(input.startedAt ?? new Date());
    const session: LocalSession = {
      id,
      userId: input.userId,
      guideId: input.guideId,
      clientGuideId: input.clientGuideId ?? id,
      startedAt,
      lastActivityAt: startedAt,
      nextStepIndex: 0,
    };

    await db.sessions.add(session);

    return session;
  };

  const getSession = (id: string) => db.sessions.get(id);

  const updateSession = async (
    id: string,
    changes: UpdateSessionInput,
  ): Promise<LocalSession | undefined> => {
    await db.sessions.update(id, changes);
    return db.sessions.get(id);
  };

  const setSessionGuideId = async (
    sessionId: string,
    guideId: string | null,
  ): Promise<LocalSession | undefined> => {
    await db.sessions.update(sessionId, { guideId });
    return db.sessions.get(sessionId);
  };

  const listSessions = () => db.sessions.orderBy("startedAt").reverse().toArray();

  const listSessionsByUserId = async (userId: string) => {
    const sessions = await db.sessions.where("userId").equals(userId).sortBy("startedAt");
    return sessions.reverse();
  };

  const listSteps = (sessionId: string) =>
    db.steps.where("sessionId").equals(sessionId).sortBy("stepIndex");

  const getLastStep = (sessionId: string) =>
    db.steps
      .where("[sessionId+stepIndex]")
      .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
      .last();

  const getCounts = async (sessionId: string): Promise<OutboxCounts> => {
    const counts = await Promise.all(
      syncStatusValues.map(async (status) => {
        const count = await db.steps
          .where("[sessionId+syncStatus]")
          .equals([sessionId, status])
          .count();
        return [status, count] as const;
      }),
    );

    return Object.fromEntries(counts) as OutboxCounts;
  };

  const listSyncableSteps = async (scope: ListSyncableStepsScope): Promise<LocalStep[]> => {
    const sessionIds = scope.sessionId
      ? [scope.sessionId]
      : scope.userId
        ? (await db.sessions.where("userId").equals(scope.userId).toArray()).map(
            (session) => session.id,
          )
        : [];

    if (sessionIds.length === 0) {
      return [];
    }

    const steps = await db.steps.where("sessionId").anyOf(sessionIds).toArray();

    return steps
      .filter((step) => syncableStatuses.includes(step.syncStatus))
      .sort((a, b) => a.sessionId.localeCompare(b.sessionId) || a.stepIndex - b.stepIndex);
  };

  const markStepUploading = async (id: string, now: DateInput = new Date()): Promise<void> => {
    const timestamp = toIso(now);
    await db.steps.update(id, {
      syncStatus: "uploading",
      lastAttemptAt: timestamp,
      updatedAt: timestamp,
    });
  };

  const markStepSynced = (id: string, input: MarkStepSyncedInput = {}): Promise<void> =>
    db.transaction("rw", db.steps, db.blobs, async () => {
      const changes: Partial<LocalStep> = {
        syncStatus: "synced",
        lastError: undefined,
        updatedAt: toIso(input.now ?? new Date()),
      };

      if (input.serverStepId !== undefined) {
        changes.serverStepId = input.serverStepId;
      }
      if (input.serverScreenshotUrl !== undefined) {
        changes.serverScreenshotUrl = input.serverScreenshotUrl;
      }

      await db.steps.update(id, changes);
      await db.blobs.where("[stepId+kind]").equals([id, "screenshot"]).delete();
    });

  const markStepFailed = async (
    id: string,
    error: string,
    now: DateInput = new Date(),
  ): Promise<void> => {
    const timestamp = toIso(now);
    await db.transaction("rw", db.steps, async () => {
      const step = await db.steps.get(id);

      if (!step) {
        return;
      }

      await db.steps.update(id, {
        syncStatus: "failed",
        retryCount: step.retryCount + 1,
        lastError: error,
        lastAttemptAt: timestamp,
        updatedAt: timestamp,
      });
    });
  };

  const resetStaleUploading = (now: DateInput = new Date()): Promise<number> => {
    const timestamp = toIso(now);
    return db.transaction("rw", db.steps, () =>
      db.steps
        .where("syncStatus")
        .equals("uploading")
        .modify({ syncStatus: "pending", updatedAt: timestamp }),
    );
  };

  const putBlob = async (input: PutBlobInput): Promise<LocalBlob> => {
    const blob: LocalBlob = {
      id: input.id ?? crypto.randomUUID(),
      stepId: input.stepId,
      kind: input.kind,
      blob: input.blob,
      createdAt: toIso(input.createdAt ?? new Date()),
    };

    await db.blobs.put(blob);

    return blob;
  };

  const getBlob = (id: string) => db.blobs.get(id);

  const getBlobByStepAndKind = (stepId: string, kind: LocalBlobKind) =>
    db.blobs.where("[stepId+kind]").equals([stepId, kind]).first();

  const deleteBlob = async (id: string): Promise<void> => {
    await db.blobs.delete(id);
  };

  const deleteBlobsForSteps = async (stepIds: readonly string[]): Promise<number> => {
    if (stepIds.length === 0) {
      return 0;
    }
    return db.blobs
      .where("stepId")
      .anyOf([...stepIds])
      .delete();
  };

  const deleteStepRecords = async (stepIds: readonly string[]): Promise<OutboxCleanupResult> => {
    const blobs = await deleteBlobsForSteps(stepIds);
    await db.steps.bulkDelete([...stepIds]);
    return { sessions: 0, steps: stepIds.length, blobs };
  };

  const deleteSessionRecords = async (
    sessionIds: readonly string[],
  ): Promise<OutboxCleanupResult> => {
    if (sessionIds.length === 0) {
      return { sessions: 0, steps: 0, blobs: 0 };
    }

    const steps = await db.steps
      .where("sessionId")
      .anyOf([...sessionIds])
      .toArray();
    const blobs = await deleteBlobsForSteps(steps.map((step) => step.id));

    await db.steps
      .where("sessionId")
      .anyOf([...sessionIds])
      .delete();
    await db.sessions.bulkDelete([...sessionIds]);

    return { sessions: sessionIds.length, steps: steps.length, blobs };
  };

  const deleteSessionData = (sessionId: string): Promise<OutboxCleanupResult> =>
    db.transaction("rw", db.sessions, db.steps, db.blobs, async () => {
      const session = await db.sessions.get(sessionId);

      if (!session) {
        return { sessions: 0, steps: 0, blobs: 0 };
      }

      const steps = await db.steps.where("sessionId").equals(sessionId).toArray();
      const blobs = await deleteBlobsForSteps(steps.map((step) => step.id));

      await db.steps.where("sessionId").equals(sessionId).delete();
      await db.sessions.delete(sessionId);

      return { sessions: 1, steps: steps.length, blobs };
    });

  const markStepDeleted = (id: string, now: DateInput = new Date()): Promise<StepDeletionOutcome> =>
    db.transaction("rw", db.steps, db.blobs, async () => {
      const step = await db.steps.get(id);

      if (!step) {
        return "removed";
      }

      if (step.syncStatus === "synced" || step.syncStatus === "deleted") {
        await db.steps.update(id, {
          syncStatus: "deleted",
          updatedAt: toIso(now),
        });
        return "marked";
      }

      await deleteStepRecords([id]);
      return "removed";
    });

  const removeStep = async (id: string): Promise<void> => {
    await db.transaction("rw", db.steps, db.blobs, async () => {
      await deleteStepRecords([id]);
    });
  };

  const prune = async (now: DateInput): Promise<OutboxCleanupResult> => {
    const nowMs = Date.parse(toIso(now));
    const result: OutboxCleanupResult = { sessions: 0, steps: 0, blobs: 0 };
    const add = (counts: OutboxCleanupResult) => {
      result.sessions += counts.sessions;
      result.steps += counts.steps;
      result.blobs += counts.blobs;
    };

    await db.transaction("rw", db.sessions, db.steps, db.blobs, async () => {
      const failedBefore = new Date(nowMs - outboxRetention.failedStepMs).toISOString();
      const unsyncedBefore = new Date(nowMs - outboxRetention.unsyncedDataMs).toISOString();
      const syncedSessionBefore = new Date(nowMs - outboxRetention.syncedSessionMs).toISOString();

      const failedSteps = await db.steps.where("syncStatus").equals("failed").toArray();
      const expiredFailedStepIds = failedSteps
        .filter((step) => step.lastAttemptAt !== undefined && step.lastAttemptAt < failedBefore)
        .map((step) => step.id);

      if (expiredFailedStepIds.length > 0) {
        add(await deleteStepRecords(expiredFailedStepIds));
      }

      const sessions = await db.sessions.toArray();

      for (const session of sessions) {
        const steps = await db.steps.where("sessionId").equals(session.id).toArray();
        const stoppedSynced =
          session.stoppedAt !== undefined &&
          session.stoppedAt < syncedSessionBefore &&
          steps.every((step) => isTerminal(step.syncStatus));
        const inactiveUnsynced =
          session.lastActivityAt < unsyncedBefore &&
          (steps.length === 0 || steps.some((step) => !isTerminal(step.syncStatus)));

        if (stoppedSynced || inactiveUnsynced) {
          add(await deleteSessionRecords([session.id]));
        }
      }
    });

    return result;
  };

  const discardForUser = (userId: string): Promise<OutboxCleanupResult> =>
    db.transaction("rw", db.sessions, db.steps, db.blobs, async () => {
      const sessions = await db.sessions.where("userId").equals(userId).toArray();

      return deleteSessionRecords(sessions.map((session) => session.id));
    });

  return {
    appendStep,
    appendStepWithBlobs,
    upsertTypingStep,
    listTypingSteps,
    findTypingStep,
    deleteTypingStep,
    createSession,
    getSession,
    updateSession,
    setSessionGuideId,
    listSessions,
    listSessionsByUserId,
    listSteps,
    getLastStep,
    getCounts,
    listSyncableSteps,
    markStepUploading,
    markStepSynced,
    markStepFailed,
    resetStaleUploading,
    putBlob,
    getBlob,
    getBlobByStepAndKind,
    deleteBlob,
    markStepDeleted,
    removeStep,
    deleteSessionData,
    prune,
    discardForUser,
  };
};

export type OutboxRepository = ReturnType<typeof createOutboxRepository>;
