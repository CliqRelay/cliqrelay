// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import type { LocalBlob, LocalStep } from "@/models";

const mocks = vi.hoisted(() => ({
  useLiveQuery: vi.fn(),
  listSteps: vi.fn(),
  bulkGet: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({ useLiveQuery: mocks.useLiveQuery }));
vi.mock("@/services/outbox", () => ({
  outboxRepository: { listSteps: mocks.listSteps },
  db: { blobs: { bulkGet: mocks.bulkGet } },
}));

import { useSessionSteps } from "./useSessionSteps";

const createObjectURL = vi.fn<(blob: Blob) => string>();

beforeAll(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

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

const makeBlob = (id: string, stepId: string, kind: LocalBlob["kind"]): LocalBlob => ({
  id,
  stepId,
  kind,
  blob: new Blob([id]),
  createdAt: "2026-11-24T09:00:00.000Z",
});

describe("useSessionSteps", () => {
  beforeEach(() => {
    createObjectURL.mockReset();
    createObjectURL.mockImplementation((blob) => `blob:${blob.size}`);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("reports loading until Dexie publishes a snapshot", () => {
    mocks.useLiveQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useSessionSteps("session-1"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.steps).toEqual([]);
    expect(result.current.progress).toEqual([]);
  });

  test("maps pending steps with preview object URLs", async () => {
    const step = makeStep({
      screenshotBlobId: "blob-screenshot",
      thumbnailBlobId: "blob-thumbnail",
      targetElement: { clickX: 10, clickY: 20 },
    });
    mocks.useLiveQuery.mockReturnValue({
      steps: [step],
      blobs: [
        makeBlob("blob-screenshot", step.id, "screenshot"),
        makeBlob("blob-thumbnail", step.id, "thumbnail"),
      ],
    });

    const { result } = renderHook(() => useSessionSteps("session-1"));

    await waitFor(() => expect(result.current.progress[0]?.screenshotUrl).toBeDefined());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.steps).toEqual([step]);
    expect(result.current.progress[0]).toMatchObject({
      jobId: "step-1",
      action: "click",
      actionText: 'Click "Save"',
      phase: "persisting",
      targetElement: { clickX: 10, clickY: 20 },
    });
    expect(result.current.progress[0]?.thumbnail).toBeDefined();
  });

  test("keeps server screenshot URLs for synced steps", () => {
    const step = makeStep({
      syncStatus: "synced",
      serverStepId: "server-step-1",
      serverScreenshotUrl: "https://cdn.example.com/step-1.webp",
    });
    mocks.useLiveQuery.mockReturnValue({ steps: [step], blobs: [] });

    const { result } = renderHook(() => useSessionSteps("session-1"));

    expect(result.current.progress[0]).toMatchObject({
      jobId: "step-1",
      phase: "completed",
      screenshotUrl: "https://cdn.example.com/step-1.webp",
    });
  });

  test("surfaces failed steps with their retry state", () => {
    mocks.useLiveQuery.mockReturnValue({
      steps: [
        makeStep({
          syncStatus: "failed",
          retryCount: 2,
          lastError: "Upload expired",
        }),
      ],
      blobs: [],
    });

    const { result } = renderHook(() => useSessionSteps("session-1"));

    expect(result.current.progress[0]).toMatchObject({
      phase: "failed",
      attempts: 2,
      error: "Upload expired",
    });
  });

  test("hides steps marked for deletion", () => {
    mocks.useLiveQuery.mockReturnValue({
      steps: [makeStep({ syncStatus: "deleted" }), makeStep({ id: "step-2", stepIndex: 1 })],
      blobs: [],
    });

    const { result } = renderHook(() => useSessionSteps("session-1"));

    expect(result.current.progress).toHaveLength(1);
    expect(result.current.progress[0]?.jobId).toBe("step-2");
  });
});
