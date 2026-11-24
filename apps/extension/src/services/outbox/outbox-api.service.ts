import { api, type CreateStepRequest, type StepAction } from "@repo/api-client";

import { withCsrf } from "@/lib/csrf";
import type { OutboxApi, OutboxCreateStepInput } from "@/models";

const toCreateStepRequest = (input: OutboxCreateStepInput): CreateStepRequest => ({
  guideId: input.guideId,
  clientStepId: input.clientStepId,
  type: "interaction",
  action: input.action as StepAction,
  url: input.url,
  ...(input.actionText !== undefined ? { actionText: input.actionText } : {}),
  ...(input.insertAfterStepId !== undefined ? { insertAfterStepId: input.insertAfterStepId } : {}),
  ...(input.targetElement !== undefined ? { targetElement: input.targetElement } : {}),
});

export const createOutboxApi = (): OutboxApi => ({
  createGuide: async (input) => {
    const response = await api.guides.createGuide(
      {
        title: input.title,
        teamId: input.teamId,
        clientGuideId: input.clientGuideId,
      },
      await withCsrf(),
    );
    return { id: response.guide.id };
  },

  deleteGuide: async (guideId) => {
    await api.guides.deleteGuide(guideId, await withCsrf());
  },

  createStep: async (input) => {
    const response = await api.steps.createStep(toCreateStepRequest(input), await withCsrf());
    return { id: response.step.id };
  },

  deleteStep: async (serverStepId) => {
    await api.steps.deleteStep(serverStepId, await withCsrf());
  },

  presignUpload: async (input) => {
    const response = await api.uploads.presignUpload(input, await withCsrf());
    return { presignedUrl: response.presignedUrl, storagePath: response.storagePath };
  },

  uploadBlob: async (presignedUrl, blob) => {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": "image/webp" },
    });

    if (!response.ok) {
      throw new Error(`Screenshot upload failed with status ${response.status}`);
    }
  },

  replaceUpload: async (input) => {
    const response = await api.uploads.replaceUpload(
      {
        stepId: input.stepId,
        storagePath: input.storagePath,
        fileSize: input.fileSize,
        mimeType: "image/webp",
        ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
        ...(input.width !== undefined ? { width: input.width } : {}),
        ...(input.height !== undefined ? { height: input.height } : {}),
      },
      await withCsrf(),
    );
    return { url: response.url };
  },
});
