import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "@repo/api-client";

import type { OutboxApi } from "./outbox-api.service";
import { classifyOutboxError, createOutboxPusher } from "./outbox-pusher.service";
import type { OutboxStepStateRepository } from "./outbox-step-state.repository";
import type { OutboxRepository } from "./outbox.repository";
import type { LocalSession, LocalStep, RecordingLifecycleStore } from "@/models";
import { RECORDING_PENDING_START_TTL_MS } from "@/utils/constants";

const NOW = new Date("2026-11-24T10:00:00.000Z");

const session = (overrides: Partial<LocalSession> = {}): LocalSession => ({
  id: "session-1",
  userId: "user-1",
  guideId: "guide-1",
  clientGuideId: "client-guide-1",
  startedAt: NOW.toISOString(),
  lastActivityAt: NOW.toISOString(),
  nextStepIndex: 1,
  ...overrides,
});

const step = (overrides: Partial<LocalStep> = {}): LocalStep => ({
  id: "step-1",
  sessionId: "session-1",
  guideId: "guide-1",
  stepIndex: 0,
  kind: "interaction",
  action: "click",
  actionText: 'Click "Sign in"',
  url: "https://angular.dev",
  capturedAt: NOW.toISOString(),
  screenshotBlobId: "blob-screenshot",
  thumbnailBlobId: "blob-thumbnail",
  syncStatus: "pending",
  retryCount: 0,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const createApiError = (status: number) => new ApiError("boom", status, {}, new Headers());

const setup = ({
  activeSession = session(),
  pendingStart,
  screenshot = new Blob(["screenshot"], { type: "image/webp" }),
  thumbnail = new Blob(["thumb"], { type: "image/webp" }),
}: {
  activeSession?: LocalSession;
  pendingStart?: { clientGuideId: string; startedAt: string };
  screenshot?: Blob;
  thumbnail?: Blob;
} = {}) => {
  const repository = {
    getBlob: vi.fn(async (id: string) => {
      if (id === "blob-screenshot" && screenshot) {
        return { id, stepId: "step-1", kind: "screenshot", blob: screenshot, createdAt: "" };
      }
      if (id === "blob-thumbnail" && thumbnail) {
        return { id, stepId: "step-1", kind: "thumbnail", blob: thumbnail, createdAt: "" };
      }
      return undefined;
    }),
    markStepUploading: vi.fn().mockResolvedValue(undefined),
    markStepSynced: vi.fn().mockResolvedValue(undefined),
    setSessionGuideId: vi.fn().mockResolvedValue(activeSession),
  } as unknown as OutboxRepository;

  const stepState = {
    setServerStepId: vi.fn().mockResolvedValue(undefined),
    setServerScreenshotUrl: vi.fn().mockResolvedValue(undefined),
  } as unknown as OutboxStepStateRepository;

  const api: OutboxApi = {
    createGuide: vi.fn().mockResolvedValue({ id: "guide-created" }),
    deleteGuide: vi.fn().mockResolvedValue(undefined),
    createStep: vi.fn().mockResolvedValue({ id: "server-step-1" }),
    deleteStep: vi.fn().mockResolvedValue(undefined),
    presignUpload: vi
      .fn()
      .mockResolvedValue({ presignedUrl: "https://s3.test/put", storagePath: "path/one" }),
    uploadBlob: vi.fn().mockResolvedValue(undefined),
    replaceUpload: vi.fn().mockResolvedValue({ url: "https://cdn.test/one.webp" }),
  };

  const lifecycleStore = {
    get: vi.fn().mockResolvedValue({
      status: "recording",
      sessionId: activeSession.id,
      isSignedOut: false,
      ...(pendingStart ? { pendingStart } : {}),
    }),
  } as unknown as RecordingLifecycleStore;

  const pusher = createOutboxPusher({
    repository,
    stepState,
    lifecycleStore,
    api,
    getActiveTeamId: vi.fn().mockResolvedValue("team-1"),
    thumbnailToBase64: vi.fn().mockResolvedValue("thumb-base64"),
    measureImage: vi.fn().mockResolvedValue({ width: 1280, height: 720 }),
    now: () => NOW,
  });

  return { pusher, repository, stepState, api, lifecycleStore };
};

describe("outbox pusher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ensureGuide", () => {
    test("reuses the guide already on the session", async () => {
      const { pusher, api, repository } = setup();

      await expect(pusher.ensureGuide(session())).resolves.toBe("guide-1");
      expect(api.createGuide).not.toHaveBeenCalled();
      expect(repository.setSessionGuideId).not.toHaveBeenCalled();
    });

    test("creates the guide once with the session's client id and persists it", async () => {
      const { pusher, api, repository } = setup({
        activeSession: session({ guideId: null }),
        pendingStart: {
          clientGuideId: "client-guide-1",
          startedAt: new Date(NOW.getTime() - 1000).toISOString(),
        },
      });

      await expect(pusher.ensureGuide(session({ guideId: null }))).resolves.toBe("guide-created");

      expect(api.createGuide).toHaveBeenCalledTimes(1);
      expect(api.createGuide).toHaveBeenCalledWith({
        title: `guide-${NOW.getTime()}`,
        teamId: "team-1",
        clientGuideId: "client-guide-1",
      });
      expect(repository.setSessionGuideId).toHaveBeenCalledWith("session-1", "guide-created");
    });

    test("never regenerates a client id after the pending start window closes", async () => {
      const { pusher, api } = setup({
        activeSession: session({ guideId: null }),
        pendingStart: {
          clientGuideId: "stale-client-guide",
          startedAt: new Date(NOW.getTime() - RECORDING_PENDING_START_TTL_MS - 1).toISOString(),
        },
      });

      await expect(pusher.ensureGuide(session({ guideId: null }))).rejects.toThrow(
        "Local session has no guide to upload to",
      );
      expect(api.createGuide).not.toHaveBeenCalled();
    });

    test("surfaces a guide creation conflict as a retryable failure", async () => {
      const { pusher, api } = setup({
        activeSession: session({ guideId: null }),
        pendingStart: { clientGuideId: "client-guide-1", startedAt: NOW.toISOString() },
      });
      vi.mocked(api.createGuide).mockRejectedValue(createApiError(409));

      const error = await pusher.ensureGuide(session({ guideId: null })).catch((err) => err);

      expect(classifyOutboxError(error)).toBeNull();
      expect(error).toBeInstanceOf(Error);
    });

    test("keeps an auth failure authoritative", async () => {
      const { pusher, api } = setup({
        activeSession: session({ guideId: null }),
        pendingStart: { clientGuideId: "client-guide-1", startedAt: NOW.toISOString() },
      });
      vi.mocked(api.createGuide).mockRejectedValue(createApiError(401));

      const error = await pusher.ensureGuide(session({ guideId: null })).catch((err) => err);

      expect(classifyOutboxError(error)).toBe("auth");
    });
  });

  describe("pushStep", () => {
    test("creates the step with its local id as clientStepId and persists the server id before uploading", async () => {
      const { pusher, api, repository, stepState } = setup();

      await pusher.pushStep({ step: step(), guideId: "guide-1", insertAfterStepId: "server-0" });

      expect(api.createStep).toHaveBeenCalledWith({
        guideId: "guide-1",
        clientStepId: "step-1",
        action: "click",
        actionText: 'Click "Sign in"',
        url: "https://angular.dev",
        insertAfterStepId: "server-0",
      });
      expect(stepState.setServerStepId).toHaveBeenCalledWith("step-1", "server-step-1", NOW);
      expect(vi.mocked(stepState.setServerStepId).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(api.presignUpload).mock.invocationCallOrder[0] ?? 0,
      );
      expect(vi.mocked(repository.markStepUploading).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(api.createStep).mock.invocationCallOrder[0] ?? 0,
      );
    });

    test("uploads the screenshot and replaces the step's local blob with the server URL", async () => {
      const { pusher, api, repository } = setup();

      await pusher.pushStep({ step: step(), guideId: "guide-1" });

      expect(api.presignUpload).toHaveBeenCalledWith({
        stepId: "server-step-1",
        guideId: "guide-1",
      });
      expect(api.uploadBlob).toHaveBeenCalledWith("https://s3.test/put", expect.any(Blob));
      expect(api.replaceUpload).toHaveBeenCalledWith({
        stepId: "server-step-1",
        storagePath: "path/one",
        fileSize: 10,
        thumbnail: "thumb-base64",
        width: 1280,
        height: 720,
      });
      expect(repository.markStepSynced).toHaveBeenCalledWith("step-1", {
        serverStepId: "server-step-1",
        serverScreenshotUrl: "https://cdn.test/one.webp",
        now: NOW,
      });
    });

    test("skips the create when the server step already exists", async () => {
      const { pusher, api, stepState } = setup();

      await pusher.pushStep({
        step: step({ serverStepId: "server-existing" }),
        guideId: "guide-1",
      });

      expect(api.createStep).not.toHaveBeenCalled();
      expect(stepState.setServerStepId).not.toHaveBeenCalled();
      expect(api.presignUpload).toHaveBeenCalledWith({
        stepId: "server-existing",
        guideId: "guide-1",
      });
    });

    test("replays the same clientStepId after a worker died before persisting the server id", async () => {
      const { pusher, api } = setup();

      await pusher.pushStep({ step: step(), guideId: "guide-1" });
      await pusher.pushStep({ step: step(), guideId: "guide-1" });

      const clientIds = vi
        .mocked(api.createStep)
        .mock.calls.map(([input]) => (input as { clientStepId: string }).clientStepId);
      expect(clientIds).toEqual(["step-1", "step-1"]);
    });

    test("resumes a step whose screenshot was already replaced without uploading twice", async () => {
      const { pusher, api, repository } = setup();

      await pusher.pushStep({
        step: step({
          serverStepId: "server-existing",
          serverScreenshotUrl: "https://cdn.test/already.webp",
        }),
        guideId: "guide-1",
      });

      expect(api.presignUpload).not.toHaveBeenCalled();
      expect(api.uploadBlob).not.toHaveBeenCalled();
      expect(repository.markStepSynced).toHaveBeenCalledWith("step-1", {
        serverStepId: "server-existing",
        serverScreenshotUrl: "https://cdn.test/already.webp",
        now: NOW,
      });
    });

    test("marks a step without a screenshot as synced without uploading", async () => {
      const { pusher, api, repository } = setup();

      await pusher.pushStep({
        step: step({ screenshotBlobId: undefined, thumbnailBlobId: undefined }),
        guideId: "guide-1",
      });

      expect(api.presignUpload).not.toHaveBeenCalled();
      expect(repository.markStepSynced).toHaveBeenCalledWith("step-1", {
        serverStepId: "server-step-1",
        now: NOW,
      });
    });
  });

  describe("classifyOutboxError", () => {
    test.each([
      [401, "auth"],
      [403, "auth"],
      [404, "guide-gone"],
      [409, "guide-gone"],
      [500, null],
      [400, null],
    ])("classifies a %s response as %s", (status, expected) => {
      expect(classifyOutboxError(createApiError(status))).toBe(expected);
    });

    test("classifies plain errors as retryable", () => {
      expect(classifyOutboxError(new Error("offline"))).toBeNull();
    });
  });
});
