import { AsyncQueuer } from "@tanstack/pacer";

import type { OutboxAuth } from "./outbox-auth.service";
import type { OutboxPusher } from "./outbox-pusher.service";
import { classifyOutboxError } from "./outbox-pusher.service";
import type { OutboxRepository } from "./outbox.repository";
import type { LocalSession, LocalStep, RecordingLifecycleStore, SyncStatus } from "@/models";

export const DRAIN_WAIT_MS = 200;
export const DRAIN_MAX_ATTEMPTS = 3;
export const DRAIN_RETRY_BASE_WAIT_MS = 500;

type QueueItem = { sessionId: string };

type OutboxDrainerDeps = {
  repository: OutboxRepository;
  pusher: OutboxPusher;
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

const syncableStatuses: SyncStatus[] = ["pending", "uploading", "failed"];

/**
 * The anchor for a retried step: the highest earlier step that already exists
 * on the server. Using `stepIndex` rather than position tolerates gaps left by
 * deleted typing steps.
 */
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

/**
 * Serialises uploads through one queue. A queue item is a session, not a step:
 * a session is drained in `stepIndex` order and a failed step is retried by the
 * queue's own backoff without ever blocking later steps.
 */
export const createOutboxDrainer = ({
  repository,
  pusher,
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

    // Every step is needed for the anchor lookup; only the unsynced ones are
    // pushed. Synced predecessors supply `insertAfterStepId`.
    const allSteps = await repository.listSteps(sessionId);
    const steps = allSteps.filter((step) => syncableStatuses.includes(step.syncStatus));
    if (steps.length === 0) {
      return;
    }

    lastRunDidWork = true;

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

    let transientFailure: Error | undefined;

    for (const step of steps) {
      if (isPaused) {
        return;
      }

      try {
        await pusher.pushStep({
          step,
          guideId,
          insertAfterStepId: findInsertAfterStepId(allSteps, step.stepIndex),
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

    // Throwing hands the whole session back to the queue's backoff so the
    // failed steps are retried without blocking the ones that succeeded.
    if (transientFailure) {
      throw transientFailure;
    }
  };

  const queue = new AsyncQueuer<QueueItem>(
    async (item) => {
      queuedSessionIds.delete(item.sessionId);
      await drainSession(item.sessionId);
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
        const state = queue.store.state;
        if (state.items.length > 0 || state.activeItems.length > 0 || !lastRunDidWork) {
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
    auth.invalidate();
    await lifecycleStore.patch({ isSignedOut: false });
    queue.start();
  };

  /** Cheap kick from the capture path: the lifecycle already knows the session. */
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

  /** Boot, alarm and re-auth entry point: every session owned by the user. */
  const drainAll = async () => {
    if (isPaused) {
      const userId = await auth.getUserId();
      if (!userId) {
        await handleAuthLost(new Error("Not signed in"));
        return;
      }
      await resume();
    }

    const userId = await auth.getUserId();
    if (!userId) {
      await handleAuthLost(new Error("Not signed in"));
      return;
    }

    const steps = await repository.listSyncableSteps({ userId });
    const sessionIds = new Set(steps.map((step) => step.sessionId));
    for (const sessionId of sessionIds) {
      enqueue(sessionId);
    }
  };

  const countOutstanding = async (): Promise<number> => {
    const userId = await auth.getUserId();

    if (userId) {
      const steps = await repository.listSyncableSteps({ userId });
      return steps.filter(
        (step) => step.syncStatus === "pending" || step.syncStatus === "uploading",
      ).length;
    }

    const sessions = await repository.listSessions();
    let total = 0;
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
