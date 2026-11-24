import type { DateInput, SyncStatus } from "@/models";
import type { OutboxDatabase } from "@/services/db";

const toIso = (value: DateInput): string =>
  typeof value === "string" ? value : value.toISOString();

type RetryFailedScope = { sessionId: string } | { userId: string };

const resolveSessionIds = async (
  db: OutboxDatabase,
  scope: RetryFailedScope,
): Promise<string[]> => {
  if ("sessionId" in scope) {
    return [scope.sessionId];
  }

  const sessions = await db.sessions.where("userId").equals(scope.userId).toArray();
  return sessions.map((session) => session.id);
};

const unsyncedStatuses: SyncStatus[] = ["pending", "uploading", "failed"];

export const createOutboxStepStateRepository = (db: OutboxDatabase) => {
  const getStep = (stepId: string) => db.steps.get(stepId);

  const setServerStepId = async (
    stepId: string,
    serverStepId: string,
    now: DateInput = new Date(),
  ): Promise<void> => {
    await db.steps.update(stepId, { serverStepId, updatedAt: toIso(now) });
  };

  const setServerScreenshotUrl = async (
    stepId: string,
    serverScreenshotUrl: string,
    now: DateInput = new Date(),
  ): Promise<void> => {
    await db.steps.update(stepId, { serverScreenshotUrl, updatedAt: toIso(now) });
  };

  const markStepDeleted = async (stepId: string, now: DateInput = new Date()): Promise<void> => {
    await db.steps.update(stepId, { syncStatus: "deleted", updatedAt: toIso(now) });
  };

  const discardUnsyncedSteps = (sessionId: string): Promise<number> =>
    db.transaction("rw", db.steps, db.blobs, async () => {
      const steps = await db.steps.where("sessionId").equals(sessionId).toArray();
      const stepIds = steps
        .filter((step) => unsyncedStatuses.includes(step.syncStatus))
        .map((step) => step.id);

      if (stepIds.length === 0) {
        return 0;
      }

      await db.blobs.where("stepId").anyOf(stepIds).delete();
      await db.steps.bulkDelete(stepIds);

      return stepIds.length;
    });

  const countPendingDeletions = async (userId?: string): Promise<number> => {
    const deleted = await db.steps.where("syncStatus").equals("deleted").toArray();
    const withServerStep = deleted.filter((step) => step.serverStepId !== undefined);

    if (!userId) {
      return withServerStep.length;
    }

    const sessions = await db.sessions.where("userId").equals(userId).toArray();
    const sessionIds = new Set(sessions.map((session) => session.id));
    return withServerStep.filter((step) => sessionIds.has(step.sessionId)).length;
  };

  const retryFailedSteps = (
    scope: RetryFailedScope,
    now: DateInput = new Date(),
  ): Promise<number> =>
    db.transaction("rw", db.sessions, db.steps, async () => {
      const sessionIds = await resolveSessionIds(db, scope);
      if (sessionIds.length === 0) {
        return 0;
      }

      const failed = await db.steps.where("syncStatus").equals("failed").toArray();
      const targets = failed
        .filter((step) => sessionIds.includes(step.sessionId))
        .map((step) => step.id);

      if (targets.length === 0) {
        return 0;
      }

      await db.steps
        .where("id")
        .anyOf(targets)
        .modify({
          syncStatus: "pending",
          lastError: undefined,
          updatedAt: toIso(now),
        });

      return targets.length;
    });

  const countFailedSteps = async (userId?: string): Promise<number> => {
    const failed = await db.steps.where("syncStatus").equals("failed").toArray();
    if (!userId) {
      return failed.length;
    }

    const sessions = await db.sessions.where("userId").equals(userId).toArray();
    const sessionIds = new Set(sessions.map((session) => session.id));
    return failed.filter((step) => sessionIds.has(step.sessionId)).length;
  };

  return {
    getStep,
    setServerStepId,
    setServerScreenshotUrl,
    markStepDeleted,
    discardUnsyncedSteps,
    countPendingDeletions,
    retryFailedSteps,
    countFailedSteps,
  };
};

export type OutboxStepStateRepository = ReturnType<typeof createOutboxStepStateRepository>;
