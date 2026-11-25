import { describe, expect, test } from "vitest";

import type { LocalStep } from "./outbox";
import {
  deriveIsDraining,
  emptyOutboxCounts,
  toStepJobProgress,
  toUploadQueueInfo,
} from "./sidepanel";

const makeStep = (overrides: Partial<LocalStep> = {}): LocalStep => ({
  id: "step-1",
  sessionId: "session-1",
  guideId: "guide-1",
  stepIndex: 0,
  kind: "interaction",
  action: "click",
  actionText: 'Click "Save"',
  url: "https://app.example.com",
  capturedAt: "2026-11-24T09:00:00.000Z",
  syncStatus: "pending",
  retryCount: 0,
  createdAt: "2026-11-24T09:00:00.000Z",
  updatedAt: "2026-11-24T09:00:00.000Z",
  ...overrides,
});

describe("sidepanel model mapping", () => {
  test("maps outbox counts onto the upload badge shape", () => {
    expect(
      toUploadQueueInfo({
        pending: 2,
        uploading: 1,
        synced: 5,
        failed: 3,
        deleted: 4,
      }),
    ).toEqual({ pending: 2, inProgress: 1, failed: 3, completed: 5 });
  });

  test("only drains while stopped with unfinished uploads", () => {
    expect(deriveIsDraining("stopped", { ...emptyOutboxCounts, pending: 1 })).toBe(true);
    expect(deriveIsDraining("stopped", { ...emptyOutboxCounts, uploading: 2 })).toBe(true);
    expect(deriveIsDraining("stopped", emptyOutboxCounts)).toBe(false);
    expect(deriveIsDraining("recording", { ...emptyOutboxCounts, pending: 1 })).toBe(false);
    expect(deriveIsDraining(undefined, { ...emptyOutboxCounts, pending: 1 })).toBe(false);
  });

  test("maps a pending step onto the progress shape with preview URLs", () => {
    expect(
      toStepJobProgress(makeStep(), {
        screenshotUrl: "blob:screenshot",
        thumbnail: "blob:thumbnail",
      }),
    ).toEqual({
      jobId: "step-1",
      guideId: "guide-1",
      action: "click",
      actionText: 'Click "Save"',
      url: "https://app.example.com",
      capturedAt: "2026-11-24T09:00:00.000Z",
      phase: "persisting",
      screenshotUrl: "blob:screenshot",
      thumbnail: "blob:thumbnail",
    });
  });

  test("maps a synced step to completed using the server screenshot", () => {
    expect(
      toStepJobProgress(
        makeStep({
          syncStatus: "synced",
          serverStepId: "server-step-1",
          serverScreenshotUrl: "https://cdn.example.com/step-1.webp",
          screenshotBlobId: "blob-screenshot",
        }),
        { screenshotUrl: "blob:stale" },
      ),
    ).toMatchObject({
      phase: "completed",
      screenshotUrl: "https://cdn.example.com/step-1.webp",
    });
  });

  test("maps a failed step with its retry state", () => {
    expect(
      toStepJobProgress(
        makeStep({
          syncStatus: "failed",
          retryCount: 2,
          lastError: "Upload expired",
        }),
      ),
    ).toMatchObject({
      phase: "failed",
      attempts: 2,
      error: "Upload expired",
    });
  });

  test("drops steps awaiting server deletion", () => {
    expect(toStepJobProgress(makeStep({ syncStatus: "deleted" }))).toBeNull();
  });

  test("omits an unset guide id", () => {
    expect(toStepJobProgress(makeStep({ guideId: null }))?.guideId).toBeUndefined();
  });
});
