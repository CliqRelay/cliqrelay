import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "@repo/api-client";

import {
  classifyOutboxError,
  createOutboxPusher,
  OutboxPermanentError,
} from "./outbox-pusher.service";
import type { OutboxStepStateRepository } from "./outbox-step-state.repository";
import type { OutboxRepository } from "./outbox.repository";
import type { LocalSession, LocalStep, OutboxApi, RecordingLifecycleStore } from "@/models";
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

type SetupOptions = {
  activeSession?: LocalSession;
  pendingStart?: { clientGuideId: string; startedAt: string };
};

const setup = ({ activeSession = session(), pendingStart }: SetupOptions = {}) => {
  const repository = {
    getBlob: vi.fn(async (id: string) => ({
      id,
      stepId: "step-1",
      kind: id === "blob-screenshot" ? "screenshot" : "thumbnail",
      blob: new Blob([id === "blob-screenshot" ? "screenshot" : "thumb"], { type: "image/webp" }),
      createdAt: "",
    })),
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

  return { pusher, repository, stepState, api };
};

const withoutGuide = () => session({ guideId: null });

const freshPendingStart = () => ({
  clientGuideId: "client-guide-1",
  startedAt: new Date(NOW.getTime() - 1000).toISOString(),
});

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

    test("creates the guide with the session's client id and a title derived from the start time", async () => {
      const { pusher, api, repository } = setup({
        activeSession: withoutGuide(),
        pendingStart: freshPendingStart(),
      });

      await expect(pusher.ensureGuide(withoutGuide())).resolves.toBe("guide-created");

      expect(api.createGuide).toHaveBeenCalledWith({
        title: `guide-${NOW.getTime()}`,
        teamId: "team-1",
        clientGuideId: "client-guide-1",
      });
      expect(repository.setSessionGuideId).toHaveBeenCalledWith("session-1", "guide-created");
    });

    test("never recreates a guide after the pending start window closes", async () => {
      const { pusher, api } = setup({
        activeSession: withoutGuide(),
        pendingStart: {
          clientGuideId: "client-guide-1",
          startedAt: new Date(NOW.getTime() - RECORDING_PENDING_START_TTL_MS - 1).toISOString(),
        },
      });

      const error = await pusher.ensureGuide(withoutGuide()).catch((err) => err);

      expect(error).toBeInstanceOf(OutboxPermanentError);
      expect(classifyOutboxError(error)).toBe("guide-required");
      expect(api.createGuide).not.toHaveBeenCalled();
    });

    test("requires a guide when no pending start exists", async () => {
      const { pusher, api } = setup({ activeSession: withoutGuide() });

      const error = await pusher.ensureGuide(withoutGuide()).catch((err) => err);

      expect(classifyOutboxError(error)).toBe("guide-required");
      expect(api.createGuide).not.toHaveBeenCalled();
    });

    test("classifies a guide creation conflict as guide-gone", async () => {
      const { pusher, api } = setup({
        activeSession: withoutGuide(),
        pendingStart: freshPendingStart(),
      });
      vi.mocked(api.createGuide).mockRejectedValue(createApiError(409));

      const error = await pusher.ensureGuide(withoutGuide()).catch((err) => err);

      expect(classifyOutboxError(error)).toBe("guide-gone");
    });

    test("propagates a server error so the drainer can retry it", async () => {
      const { pusher, api } = setup({
        activeSession: withoutGuide(),
        pendingStart: freshPendingStart(),
      });
      vi.mocked(api.createGuide).mockRejectedValue(createApiError(500));

      const error = await pusher.ensureGuide(withoutGuide()).catch((err) => err);

      expect(classifyOutboxError(error)).toBeNull();
    });
  });

  describe("pushStep", () => {
    test("creates the step with its local id and anchor, persisting the server id before uploading", async () => {
      const { pusher, api, repository, stepState } = setup();

      await pusher.pushStep({
        step: step({ targetElement: { selector: "#sign-in" } }),
        guideId: "guide-1",
        insertAfterStepId: "server-0",
      });

      expect(api.createStep).toHaveBeenCalledWith({
        guideId: "guide-1",
        clientStepId: "step-1",
        action: "click",
        actionText: 'Click "Sign in"',
        url: "https://angular.dev",
        targetElement: { selector: "#sign-in" },
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

    test.each([
      [409, "step-conflict"],
      [500, null],
    ] as const)("classifies a %s from step creation as %s", async (status, expected) => {
      const { pusher, api, repository, stepState } = setup();
      vi.mocked(api.createStep).mockRejectedValue(createApiError(status));

      const error = await pusher.pushStep({ step: step(), guideId: "guide-1" }).catch((err) => err);

      expect(classifyOutboxError(error)).toBe(expected);
      expect(stepState.setServerStepId).not.toHaveBeenCalled();
      expect(repository.markStepSynced).not.toHaveBeenCalled();
    });

    test("uploads the screenshot and replaces the local blob with the server URL", async () => {
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

    test("replays the same clientStepId when the server id was never persisted", async () => {
      const { pusher, api } = setup();

      await pusher.pushStep({ step: step(), guideId: "guide-1" });
      await pusher.pushStep({ step: step(), guideId: "guide-1" });

      expect(vi.mocked(api.createStep).mock.calls.map(([input]) => input.clientStepId)).toEqual([
        "step-1",
        "step-1",
      ]);
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
      [400, null],
      [500, null],
    ])("classifies a %s response as %s", (status, expected) => {
      expect(classifyOutboxError(createApiError(status))).toBe(expected);
    });

    test.each(["auth", "guide-gone", "step-conflict", "guide-required"] as const)(
      "classifies a permanent %s error",
      (kind) => {
        expect(classifyOutboxError(new OutboxPermanentError(kind, "boom"))).toBe(kind);
      },
    );

    test("classifies plain errors as retryable", () => {
      expect(classifyOutboxError(new Error("offline"))).toBeNull();
    });
  });
});
