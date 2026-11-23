import type { Step } from "@repo/api-client";

import type { StepJobProgress } from "@/models";

/**
 * The sidepanel renders uploaded steps from the background's progress list.
 * That list lives in worker memory, so a worker restart would hide every step
 * of a live session. Until the outbox moves steps into IndexedDB (PR 5) the
 * guide on the server is the only durable copy, so boot reads it back.
 */
export const mapStepsToJobProgress = (steps: Step[]): StepJobProgress[] =>
  steps.map((step) => {
    const mediaAsset = step.mediaAssets?.[0];

    return {
      jobId: step.id,
      stepId: step.id,
      guideId: step.guideId,
      action: step.action ?? "navigation",
      ...(step.actionText ? { actionText: step.actionText } : {}),
      url: step.url ?? "",
      capturedAt: step.createdAt,
      phase: "completed",
      ...(mediaAsset?.url ? { screenshotUrl: mediaAsset.url } : {}),
      ...(mediaAsset?.thumbnail ? { thumbnail: mediaAsset.thumbnail } : {}),
      ...(step.targetElement ? { targetElement: step.targetElement } : {}),
    };
  });

type RestoreStepProgressDeps = {
  getActiveGuideId: () => Promise<string | undefined>;
  listSteps: (guideId: string) => Promise<Step[]>;
};

export const restoreStepProgress = async ({
  getActiveGuideId,
  listSteps,
}: RestoreStepProgressDeps): Promise<StepJobProgress[]> => {
  const guideId = await getActiveGuideId();
  if (!guideId) {
    return [];
  }

  try {
    return mapStepsToJobProgress(await listSteps(guideId));
  } catch (error) {
    // Offline is normal at boot; the session keeps recording and new steps
    // still upload. Only the pre-restart history is missing from the panel.
    console.warn("[background] Failed to restore step progress:", error);
    return [];
  }
};
