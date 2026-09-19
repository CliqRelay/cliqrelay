import type { MediaAsset, Step, StepCanvasContent } from "@repo/api-client";

export const TEST_IMAGE_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export function makeMediaAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "media-1",
    stepId: "step-1",
    storagePath: "uploads/step-1.png",
    mimeType: "image/png",
    url: TEST_IMAGE_URL,
    width: 1,
    height: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeInteractionStep(overrides: Partial<Step> = {}): Step {
  return {
    id: "step-1",
    guideId: "guide-1",
    type: "interaction",
    action: "click",
    actionText: "Click the Save button",
    sortOrder: "a0",
    mediaAssets: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeCanvasStep(
  canvasContent: Partial<StepCanvasContent> = {},
  overrides: Partial<Step> = {},
): Step {
  return {
    id: "step-1",
    guideId: "guide-1",
    type: "canvas",
    sortOrder: "a0",
    mediaAssets: [],
    canvasContent: {
      type: "tip",
      headingText: "Keep this in mind",
      bodyText: "Some **markdown** body text.",
      ...canvasContent,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
