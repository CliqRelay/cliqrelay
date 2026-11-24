import { AsyncQueuer } from "@tanstack/pacer";

import type { OutboxAuth } from "./outbox-auth.service";
import type { OutboxDeleter } from "./outbox-deleter.service";
import type { OutboxPusher } from "./outbox-pusher.service";
import { classifyOutboxError } from "./outbox-pusher.service";
import type { OutboxRepository } from "./outbox.repository";
import type { LocalSession, LocalStep, RecordingLifecycleStore } from "@/models";

const DRAIN_WAIT_MS = 200;
const DRAIN_MAX_ATTEMPTS = 3;
const DRAIN_RETRY_BASE_WAIT_MS = 500;

type QueueItem = { sessionId: string };

type OutboxDrainerDeps = {
  repository: OutboxRepository;
  pusher: OutboxPusher;
  deleter: OutboxDeleter;
  auth: OutboxAuth;
  lifecycleStore: RecordingLifecycleStore;
  now?: () => Date;
  waitMs?: number;
  maxAttempts?: number;
  retryBaseWaitMs?: number;
  onStepFailed?: () => void | Promise<void>;
  onDrainCompleted?: () => void | Promise<void>;
  onAuthLost?: () => void | Promise<void>;
  onGuideGone?: (session: LocalSession) => void | Promise<void>;
  log?: (message: string, details?: Record<string, unknown>) => void;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const isSyncableStep = (step: LocalStep): boolean =>
  step.syncStatus !== "synced" && step.syncStatus !== "deleted";

export const findInsertAfterStepId = (
  steps: readonly LocalStep[],
  stepIndex: number,
): string | undefined => {
  let anchor: LocalStep | undefined;

  for (const step of steps) {
    if (step.stepIndex >= stepIndex || !step.serverStepId || step.syncStatus === "deleted") {
      continue;
    }
    if (!anchor || step.stepIndex > anchor.stepIndex) {
      anchor = step;
    }
  }

  return anchor?.serverStepId;
};

const hasLaterServerStep = (steps: readonly LocalStep[], step: LocalStep): boolean =>
  steps.some(
    (other) =>
      other.stepIndex > step.stepIndex &&
      other.serverStepId !== undefined &&
      other.syncStatus !== "deleted",
  );

const insertAfterStepIdFor = (steps: readonly LocalStep[], step: LocalStep): string | undefined =>
  hasLaterServerStep(steps, step) ? findInsertAfterStepId(steps, step.stepIndex) : undefined;

export const createOutboxDrainer = ({
  repository,
  pusher,
  deleter,
  auth,
  lifecycleStore,
  now = () => new Date(),
  waitMs = DRAIN_WAIT_MS,
  maxAttempts = DRAIN_MAX_ATTEMPTS,
  retryBaseWaitMs = DRAIN_RETRY_BASE_WAIT_MS,
  onStepFailed,
  onDrainCompleted,
  onAuthLost,
  onGuideGone,
  log = console.info,
}: OutboxDrainerDeps) => {
  const queuedSessionIds = new Set<string>();
  let isPaused = false;
  let lastError: string | null = null;
  let lastRunDidWork = false;

  const pause = () => {
    isPaused = true;
    lastRunDidWork = false;
    queue.stop();
  };

  const handleAuthLost = async (error: unknown) => {
    lastError = toError(error).message;
    auth.invalidate();
    pause();
    await onAuthLost?.();
  };

  const handleGuideGone = async (session: LocalSession, error: unknown) => {
    lastError = toError(error).message;
    log("[background] Guide is gone; discarding local capture data", {
      sessionId: session.id,
      guideId: session.guideId,
      error: lastError,
    });
    await repository.deleteSessionData(session.id);
    await onGuideGone?.(session);
  };

  const markStepsFailed = async (steps: readonly LocalStep[], message: string) => {
    await Promise.all(steps.map((step) => repository.markStepFailed(step.id, message, now())));
    await onStepFailed?.();
  };

  const drainSession = async (sessionId: string) => {
    if (isPaused) {
      return;
    }

    const session = await repository.getSession(sessionId);
    if (!session) {
      return;
    }

    const userId = await auth.getUserId();
    if (!userId) {
      await handleAuthLost(new Error("Not signed in"));
      return;
    }
    if (session.userId !== userId) {
      return;
    }

    const allSteps = await repository.listSteps(sessionId);
    const steps = allSteps.filter(isSyncableStep);
    const deletions = allSteps.filter(
      (step) => step.syncStatus === "deleted" && step.serverStepId !== undefined,
    );

    if (steps.length === 0 && deletions.length === 0) {
      return;
    }

    lastRunDidWork = true;
    let transientFailure: Error | undefined;

    if (steps.length > 0) {
      let guideId: string;
      try {
        guideId = await pusher.ensureGuide(session);
      } catch (error) {
        const kind = classifyOutboxError(error);
        if (kind === "auth") {
          await handleAuthLost(error);
          return;
        }
        if (kind === "guide-gone") {
          await handleGuideGone(session, error);
          return;
        }

        await markStepsFailed(steps, toError(error).message);
        throw error;
      }

      for (const step of steps) {
        if (isPaused) {
          return;
        }

        try {
          await pusher.pushStep({
            step,
            guideId,
            insertAfterStepId: insertAfterStepIdFor(allSteps, step),
          });
        } catch (error) {
          const kind = classifyOutboxError(error);
          if (kind === "auth") {
            await handleAuthLost(error);
            return;
          }
          if (kind === "guide-gone") {
            await handleGuideGone(session, error);
            return;
          }

          transientFailure = toError(error);
          lastError = transientFailure.message;
          await markStepsFailed([step], transientFailure.message);
        }
      }
    }

    for (const step of deletions) {
      if (isPaused) {
        return;
      }

      try {
        const outcome = await deleter.pushDeletion(step);
        if (outcome === "retrying") {
          lastError = `Step ${step.id} delete failed; retrying on the next drain`;
        }
      } catch (error) {
        if (classifyOutboxError(error) === "auth") {
          await handleAuthLost(error);
          return;
        }

        lastError = toError(error).message;
      }
    }

    if (transientFailure) {
      throw transientFailure;
    }
  };

  const queue = new AsyncQueuer<QueueItem>(
    async (item) => {
      try {
        await drainSession(item.sessionId);
      } finally {
        queuedSessionIds.delete(item.sessionId);
      }
    },
    {
      concurrency: 1,
      wait: waitMs,
      started: true,
      throwOnError: true,
      asyncRetryerOptions: {
        backoff: "exponential",
        baseWait: retryBaseWaitMs,
        maxAttempts,
        jitter: 0.2,
      },
      onError: (error) => {
        lastError = toError(error).message;
      },
      onSettled: () => {
        if (isPaused || !lastRunDidWork) {
          return;
        }

        const state = queue.store.state;
        if (state.items.length > 0 || state.activeItems.length > 0) {
          return;
        }

        lastRunDidWork = false;
        void onDrainCompleted?.();
      },
    },
  );

  const enqueue = (sessionId: string) => {
    if (isPaused || queuedSessionIds.has(sessionId)) {
      return;
    }

    queuedSessionIds.add(sessionId);
    queue.addItem({ sessionId });
  };

  const resume = async () => {
    if (!isPaused) {
      return;
    }

    isPaused = false;
    await lifecycleStore.patch({ isSignedOut: false });
    queue.start();
  };

  const kick = async () => {
    if (isPaused) {
      return;
    }

    const lifecycle = await lifecycleStore.get();
    if (lifecycle.sessionId) {
      enqueue(lifecycle.sessionId);
    }
  };

  const kickSession = (sessionId: string) => {
    enqueue(sessionId);
  };

  const drainAll = async () => {
    const userId = await auth.getUserId();

    if (!userId) {
      if (!isPaused) {
        await handleAuthLost(new Error("Not signed in"));
      }
      return;
    }

    if (isPaused) {
      await resume();
    }

    const sessions = await repository.listSessionsByUserId(userId);
    for (const session of sessions) {
      enqueue(session.id);
    }
  };

  const countOutstanding = async (): Promise<number> => {
    const userId = await auth.getUserId();
    const pendingDeletions = await deleter.countPendingDeletions(userId ?? undefined);

    if (userId) {
      const steps = await repository.listSyncableSteps({ userId });
      const uploads = steps.filter(
        (step) => step.syncStatus === "pending" || step.syncStatus === "uploading",
      ).length;
      return uploads + pendingDeletions;
    }

    const sessions = await repository.listSessions();
    let total = pendingDeletions;
    for (const session of sessions) {
      const counts = await repository.getCounts(session.id);
      total += counts.pending + counts.uploading;
    }
    return total;
  };

  const getState = () => {
    const state = queue.store.state;
    return {
      isPaused,
      isRunning: state.isRunning,
      queued: state.items.length,
      active: state.activeItems.length,
      lastError,
    };
  };

  return { kick, kickSession, drainAll, countOutstanding, getState, pause, resume };
};

export type OutboxDrainer = ReturnType<typeof createOutboxDrainer>;
