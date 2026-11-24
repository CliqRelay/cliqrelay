import { classifyOutboxError } from "./outbox-pusher.service";
import type { OutboxStepStateRepository } from "./outbox-step-state.repository";
import type { OutboxRepository } from "./outbox.repository";
import type { GuideDeleteOutcome, LocalStep, OutboxApi, StepDeleteOutcome } from "@/models";

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

export const createOutboxDeleter = ({
  repository,
  stepState,
  api,
  now = () => new Date(),
  log = (message, error) => console.warn(message, error),
}: OutboxDeleterDeps) => {
  const removeServerStep = async (step: LocalStep): Promise<void> => {
    if (step.serverStepId) {
      try {
        await api.deleteStep(step.serverStepId);
      } catch (error) {
        if (classifyOutboxError(error) !== "guide-gone") {
          throw error;
        }
      }
    }

    await repository.removeStep(step.id);
  };

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
      await removeServerStep(step);
      return "removed";
    } catch (error) {
      log(`[background] Step ${step.id} will be deleted on the next drain`, error);
      return "retrying";
    }
  };

  const pushDeletion = async (step: LocalStep): Promise<StepDeleteOutcome> => {
    try {
      await removeServerStep(step);
      return "removed";
    } catch (error) {
      if (classifyOutboxError(error) === "auth") {
        throw error;
      }
      log(`[background] Step ${step.id} delete failed; retrying later`, error);
      return "retrying";
    }
  };

  const deleteGuide = async (guideId: string): Promise<GuideDeleteOutcome> => {
    try {
      await api.deleteGuide(guideId);
      return "deleted";
    } catch (error) {
      if (classifyOutboxError(error) === "guide-gone") {
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
