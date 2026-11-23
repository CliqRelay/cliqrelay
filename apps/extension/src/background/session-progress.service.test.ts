import { describe, expect, test, vi } from "vitest";

import type { Step } from "@repo/api-client";

import { mapStepsToJobProgress, restoreStepProgress } from "./session-progress.service";

const createStep = (overrides: Partial<Step> = {}): Step =>
  ({
    id: "step-1",
    guideId: "guide-1",
    type: "interaction",
    action: "click",
    actionText: 'Click "Save"',
    url: "https://example.com",
    createdAt: "2026-11-23T10:00:00.000Z",
    updatedAt: "2026-11-23T10:00:00.000Z",
    sortOrder: "1",
    mediaAssets: [
      {
        id: "asset-1",
        stepId: "step-1",
        storagePath: "stub/step-1.webp",
        url: "https://cdn.example.com/step-1.webp",
        thumbnail: "thumb-1",
        createdAt: "2026-11-23T10:00:00.000Z",
        updatedAt: "2026-11-23T10:00:00.000Z",
      },
    ],
    ...overrides,
  }) as Step;

describe("mapStepsToJobProgress", () => {
  test("maps an uploaded step into the sidepanel progress shape", () => {
    expect(mapStepsToJobProgress([createStep()])).toEqual([
      {
        jobId: "step-1",
        stepId: "step-1",
        guideId: "guide-1",
        action: "click",
        actionText: 'Click "Save"',
        url: "https://example.com",
        capturedAt: "2026-11-23T10:00:00.000Z",
        phase: "completed",
        screenshotUrl: "https://cdn.example.com/step-1.webp",
        thumbnail: "thumb-1",
      },
    ]);
  });

  test("keeps restored steps readable when the server payload is sparse", () => {
    const [progress] = mapStepsToJobProgress([
      createStep({ action: null, actionText: null, url: null, mediaAssets: [] }),
    ]);

    expect(progress).toEqual({
      jobId: "step-1",
      stepId: "step-1",
      guideId: "guide-1",
      action: "navigation",
      url: "",
      capturedAt: "2026-11-23T10:00:00.000Z",
      phase: "completed",
    });
  });
});

describe("restoreStepProgress", () => {
  test("lists the steps of the active guide", async () => {
    const listSteps = vi.fn().mockResolvedValue([createStep()]);

    const restored = await restoreStepProgress({
      getActiveGuideId: vi.fn().mockResolvedValue("guide-1"),
      listSteps,
    });

    expect(listSteps).toHaveBeenCalledWith("guide-1");
    expect(restored).toHaveLength(1);
  });

  test("returns nothing when no guide is active", async () => {
    const listSteps = vi.fn();

    await expect(
      restoreStepProgress({ getActiveGuideId: vi.fn().mockResolvedValue(undefined), listSteps }),
    ).resolves.toEqual([]);
    expect(listSteps).not.toHaveBeenCalled();
  });

  test("keeps booting when the steps cannot be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      restoreStepProgress({
        getActiveGuideId: vi.fn().mockResolvedValue("guide-1"),
        listSteps: vi.fn().mockRejectedValue(new Error("offline")),
      }),
    ).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });
});
