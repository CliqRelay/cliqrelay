import { ApiError } from "@repo/api-client";

import type { OutboxApi } from "./outbox-api.service";
import { isAuthError } from "./outbox-pusher.service";
import type { OutboxStepStateRepository } from "./outbox-step-state.repository";
import type { OutboxRepository } from "./outbox.repository";
import type { LocalStep } from "@/models";

const GONE_STATUSES = [404, 409];

export type StepDeleteOutcome = "removed" | "retrying" | "missing";
export type GuideDeleteOutcome = "deleted" | "missing";

const isGoneError = (error: unknown): boolean =>
  error instanceof ApiError && GONE_STATUSES.includes(error.status);

type OutboxDeleterDeps = {
  repository: Pick<OutboxRepository, "removeStep">;
  stepState: Pick<
    OutboxStepStateRepository,
    "getStep" | "markStepDeleted" | "countPendingDeletions"
  >;
  api: Pick<OutboxApi, "deleteStep" | "deleteGuide">;
  now?: () => Date;
  log?: (message: string, error: unknown) => void;
};

/**
 * Local-first deletion. A local-only step disappears immediately; a step that
 * exists on the server is marked `deleted` first so a failed request keeps the
 * row (and thumbnail) for the drainer to retry. A step already gone on the
 * server (404, or a soft-deleted 409) is a success.
 */
export const createOutboxDeleter = ({
  repository,
  stepState,
  api,
  now = () => new Date(),
  log = (message, error) => console.warn(message, error),
}: OutboxDeleterDeps) => {
  const confirmServerDelete = async (step: LocalStep): Promise<void> => {
    if (!step.serverStepId) {
      await repository.removeStep(step.id);
      return;
    }

    try {
      await api.deleteStep(step.serverStepId);
    } catch (error) {
      if (isGoneError(error)) {
        await repository.removeStep(step.id);
        return;
      }
      throw error;
    }

    await repository.removeStep(step.id);
  };

  /** Sidepanel command: returns `retrying` when the server delete must wait. */
  const deleteStep = async (stepId: string): Promise<StepDeleteOutcome> => {
    const step = await stepState.getStep(stepId);

    if (!step) {
      return "missing";
    }

    if (!step.serverStepId) {
      await repository.removeStep(step.id);
      return "removed";
    }

    await stepState.markStepDeleted(step.id, now());

    try {
      await confirmServerDelete(step);
      return "removed";
    } catch (error) {
      log(`[background] Step ${step.id} will be deleted on the next drain`, error);
      return "retrying";
    }
  };

  /** Drainer path for rows already marked `deleted`; auth failures bubble up. */
  const pushDeletion = async (step: LocalStep): Promise<StepDeleteOutcome> => {
    try {
      await confirmServerDelete(step);
      return "removed";
    } catch (error) {
      if (isAuthError(error)) {
        throw error;
      }
      log(`[background] Step ${step.id} delete failed; retrying later`, error);
      return "retrying";
    }
  };

  /** Guide deletion stays synchronous: a failure leaves the session for retry. */
  const deleteGuide = async (guideId: string): Promise<GuideDeleteOutcome> => {
    try {
      await api.deleteGuide(guideId);
      return "deleted";
    } catch (error) {
      if (isGoneError(error)) {
        return "missing";
      }
      throw error;
    }
  };

  return {
    deleteStep,
    pushDeletion,
    deleteGuide,
    countPendingDeletions: (userId?: string) => stepState.countPendingDeletions(userId),
  };
};

export type OutboxDeleter = ReturnType<typeof createOutboxDeleter>;
