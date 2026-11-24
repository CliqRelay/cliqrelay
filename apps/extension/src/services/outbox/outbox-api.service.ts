import { api, type CreateStepRequest } from "@repo/api-client";

import { withCsrf } from "@/lib/csrf";

export type OutboxCreateStepInput = {
  guideId: string;
  clientStepId: string;
  action: string;
  actionText?: string;
  url: string;
  targetElement?: CreateStepRequest["targetElement"];
  insertAfterStepId?: string;
};

export type OutboxCreateGuideInput = {
  title: string;
  teamId: string;
  clientGuideId: string;
};

export type OutboxReplaceUploadInput = {
  stepId: string;
  storagePath: string;
  fileSize: number;
  thumbnail?: string;
  width?: number;
  height?: number;
};

export type OutboxApi = {
  createGuide: (input: OutboxCreateGuideInput) => Promise<{ id: string }>;
  createStep: (input: OutboxCreateStepInput) => Promise<{ id: string }>;
  presignUpload: (input: {
    stepId: string;
    guideId: string;
  }) => Promise<{ presignedUrl: string; storagePath: string }>;
  uploadBlob: (presignedUrl: string, blob: Blob) => Promise<void>;
  replaceUpload: (input: OutboxReplaceUploadInput) => Promise<{ url: string }>;
};

const toCreateStepRequest = (input: OutboxCreateStepInput): CreateStepRequest => ({
  guideId: input.guideId,
  clientStepId: input.clientStepId,
  type: "interaction",
  action: input.action as CreateStepRequest["action"],
  url: input.url,
  ...(input.actionText !== undefined ? { actionText: input.actionText } : {}),
  ...(input.insertAfterStepId !== undefined ? { insertAfterStepId: input.insertAfterStepId } : {}),
  ...(input.targetElement !== undefined
    ? { targetElement: input.targetElement as CreateStepRequest["targetElement"] }
    : {}),
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

  createStep: async (input) => {
    const response = await api.steps.createStep(toCreateStepRequest(input), await withCsrf());
    return { id: response.step.id };
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
