import type { DateInput } from "@/models";
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

/**
 * Step bookkeeping the drainer needs but the outbox repository does not expose:
 * persisting the server id the moment it exists (so a killed worker resumes
 * without a second create) and resetting manual retries.
 */
export const createOutboxStepStateRepository = (db: OutboxDatabase) => {
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
    setServerStepId,
    setServerScreenshotUrl,
    retryFailedSteps,
    countFailedSteps,
  };
};

export type OutboxStepStateRepository = ReturnType<typeof createOutboxStepStateRepository>;
