import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@repo/api-client";

import { createScreenshotUploadOrchestrator } from "./screenshot-orchestrator.service";
import type { CaptureBridgeMessage } from "@/models";

vi.mock("@repo/api-client", () => ({
  api: {
    uploads: { presignUpload: vi.fn(), replaceUpload: vi.fn() },
    steps: { createStep: vi.fn() },
  },
}));

vi.mock("@/lib/csrf", () => ({
  withCsrf: vi.fn().mockResolvedValue({ credentials: "include", headers: {} }),
}));

const { webpBlob } = vi.hoisted(() => ({
  webpBlob: new Blob(["webp"], { type: "image/webp" }),
}));
vi.mock("@/utils/image", () => ({
  processScreenshotForUpload: vi.fn().mockResolvedValue({
    webpBlob,
    thumbnailBase64: "thumb",
    width: 1280,
    height: 720,
  }),
}));

const guideId = "guide-1";
const stepId = "step-1";
const storagePath = `uploads/guides/${guideId}/steps/${stepId}/1.webp`;
const presignedUrl = "https://bucket.example/put";
const screenshotUrl = "https://bucket.example/get";

const navigationMessage = (captureId: string): CaptureBridgeMessage => ({
  source: "background",
  type: "cliqrelay:capture-event",
  payload: {
    captureId,
    action: "navigation",
    url: "https://example.com",
    capturedAt: "2026-01-01T00:00:00.000Z",
  },
});

const presignUpload = vi.mocked(api.uploads.presignUpload);
const replaceUpload = vi.mocked(api.uploads.replaceUpload);
const createStep = vi.mocked(api.steps.createStep);
const fetchMock = vi.fn();

const createOrchestrator = () =>
  createScreenshotUploadOrchestrator(async () => ({ guideId, isNew: false }));

describe("createScreenshotUploadOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({ ok: true });
    createStep.mockResolvedValue({
      step: { id: stepId },
    } as unknown as Awaited<ReturnType<typeof api.steps.createStep>>);
    presignUpload.mockResolvedValue({ presignedUrl, storagePath });
    replaceUpload.mockResolvedValue({
      url: screenshotUrl,
      storagePath,
    } as unknown as Awaited<ReturnType<typeof api.uploads.replaceUpload>>);
  });

  it("creates the step, uploads to the presigned URL and calls replaceUpload", async () => {
    const result = await createOrchestrator().processCaptureForUpload(
      "data:image/png;base64,AAAA",
      navigationMessage("capture-happy"),
    );

    expect(presignUpload).toHaveBeenCalledWith(
      { stepId, guideId },
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(presignedUrl, {
      method: "PUT",
      body: webpBlob,
      headers: { "Content-Type": "image/webp" },
    });
    expect(replaceUpload).toHaveBeenCalledWith(
      {
        stepId,
        storagePath,
        fileSize: webpBlob.size,
        mimeType: "image/webp",
        thumbnail: "thumb",
        width: 1280,
        height: 720,
      },
      expect.objectContaining({ credentials: "include" }),
    );

    const order = [createStep, presignUpload, fetchMock, replaceUpload].map(
      (mocked) => mocked.mock.invocationCallOrder[0] ?? Number.NaN,
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(result).toMatchObject({ stepId, guideId, screenshotUrl, storagePath });
  });

  it("reuses the cached step on retry and replaces its media instead of creating a new step", async () => {
    const orchestrator = createOrchestrator();
    const message = navigationMessage("capture-retry");

    await orchestrator.processCaptureForUpload("data:image/png;base64,AAAA", message);
    await orchestrator.processCaptureForUpload("data:image/png;base64,AAAA", message);

    expect(createStep).toHaveBeenCalledTimes(1);
    expect(replaceUpload).toHaveBeenCalledTimes(2);
    expect(replaceUpload.mock.calls.every(([body]) => body?.stepId === stepId)).toBe(true);
  });

  it("does not call replaceUpload when the PUT to storage fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(
      createOrchestrator().processCaptureForUpload(
        "data:image/png;base64,AAAA",
        navigationMessage("capture-put-fails"),
      ),
    ).rejects.toThrow("Failed to upload to S3: 500");

    expect(replaceUpload).not.toHaveBeenCalled();
  });
});
