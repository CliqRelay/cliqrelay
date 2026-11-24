import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "@repo/api-client";

import { createOutboxDrainer, findInsertAfterStepId } from "./outbox-drainer.service";
import { OutboxPermanentError } from "./outbox-pusher.service";
import type { LocalSession, LocalStep, RecordingLifecycleStore } from "@/models";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";

const NOW = "2026-11-24T10:00:00.000Z";

const session = (overrides: Partial<LocalSession> = {}): LocalSession => ({
  id: "session-1",
  userId: "user-1",
  guideId: "guide-1",
  clientGuideId: "client-guide-1",
  startedAt: NOW,
  lastActivityAt: NOW,
  nextStepIndex: 3,
  ...overrides,
});

const step = (overrides: Partial<LocalStep> = {}): LocalStep => ({
  id: "step-1",
  sessionId: "session-1",
  guideId: "guide-1",
  stepIndex: 0,
  kind: "interaction",
  action: "click",
  url: "https://angular.dev",
  capturedAt: NOW,
  syncStatus: "pending",
  retryCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const createApiError = (status: number) => new ApiError("boom", status, {}, new Headers());

const setup = ({
  steps = [step()] as LocalStep[],
  userId = "user-1" as string | null,
  activeSession = session(),
  pushStep = vi.fn().mockResolvedValue(undefined),
} = {}) => {
  const repository = {
    getSession: vi.fn().mockResolvedValue(activeSession),
    listSteps: vi.fn().mockResolvedValue(steps),
    listSyncableSteps: vi
      .fn()
      .mockResolvedValue(steps.filter((entry) => entry.syncStatus !== "synced")),
    markStepFailed: vi.fn().mockResolvedValue(undefined),
    listSessions: vi.fn().mockResolvedValue([activeSession]),
    getCounts: vi.fn().mockResolvedValue({
      pending: 1,
      uploading: 0,
      synced: 0,
      failed: 0,
      deleted: 0,
    }),
    deleteSessionData: vi.fn().mockResolvedValue({ sessions: 1, steps: 1, blobs: 2 }),
  } as unknown as OutboxRepository;

  const pusher = {
    ensureGuide: vi.fn().mockResolvedValue(activeSession.guideId ?? "guide-new"),
    pushStep,
  };

  const auth = {
    getUserId: vi.fn().mockResolvedValue(userId),
    invalidate: vi.fn(),
  };

  const lifecycleStore = {
    get: vi.fn().mockResolvedValue({
      status: "recording",
      sessionId: activeSession.id,
      isSignedOut: false,
    }),
    set: vi.fn(),
    patch: vi.fn(),
  } as unknown as RecordingLifecycleStore;

  const onStepFailed = vi.fn().mockResolvedValue(undefined);
  const onDrainCompleted = vi.fn().mockResolvedValue(undefined);
  const onAuthLost = vi.fn().mockResolvedValue(undefined);
  const onGuideGone = vi.fn().mockResolvedValue(undefined);

  const drainer = createOutboxDrainer({
    repository,
    pusher,
    auth,
    lifecycleStore,
    waitMs: 0,
    retryBaseWaitMs: 1,
    onStepFailed,
    onDrainCompleted,
    onAuthLost,
    onGuideGone,
    log: () => {},
  });

  return {
    drainer,
    repository,
    pusher,
    auth,
    lifecycleStore,
    onStepFailed,
    onDrainCompleted,
    onAuthLost,
    onGuideGone,
  };
};

const waitForIdle = async (drainer: ReturnType<typeof createOutboxDrainer>) => {
  await vi.waitFor(() => {
    const state = drainer.getState();
    expect(state.queued).toBe(0);
    expect(state.active).toBe(0);
  });
};

describe("findInsertAfterStepId", () => {
  test("picks the highest earlier step that exists on the server", () => {
    const steps = [
      step({ id: "a", stepIndex: 0, serverStepId: "server-0" }),
      step({ id: "b", stepIndex: 3, serverStepId: "server-3" }),
      step({ id: "c", stepIndex: 7 }),
      step({ id: "d", stepIndex: 9, serverStepId: "server-9" }),
    ];

    expect(findInsertAfterStepId(steps, 7)).toBe("server-3");
  });

  test("ignores steps deleted on the server", () => {
    const steps = [
      step({ id: "a", stepIndex: 0, serverStepId: "server-0" }),
      step({ id: "b", stepIndex: 4, serverStepId: "server-4", syncStatus: "deleted" }),
    ];

    expect(findInsertAfterStepId(steps, 7)).toBe("server-0");
  });

  test("tolerates gaps from deleted typing steps", () => {
    const steps = [
      step({ id: "a", stepIndex: 0, serverStepId: "server-0" }),
      step({ id: "b", stepIndex: 4, serverStepId: "server-4" }),
    ];

    expect(findInsertAfterStepId(steps, 5)).toBe("server-4");
  });

  test("returns undefined when nothing earlier is on the server", () => {
    const steps = [step({ id: "a", stepIndex: 2 }), step({ id: "b", stepIndex: 6 })];

    expect(findInsertAfterStepId(steps, 6)).toBeUndefined();
  });
});

describe("outbox drainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ordering", () => {
    test("pushes a session's steps in stepIndex order and anchors retries", async () => {
      const steps = [
        step({ id: "step-0", stepIndex: 0, serverStepId: "server-0", syncStatus: "synced" }),
        step({ id: "step-4", stepIndex: 4, serverStepId: "server-4", syncStatus: "synced" }),
        step({ id: "step-7", stepIndex: 7 }),
        step({ id: "step-9", stepIndex: 9 }),
      ];
      const { drainer, pusher } = setup({ steps });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pusher.pushStep.mock.calls.map(([input]) => input.step.id)).toEqual([
        "step-7",
        "step-9",
      ]);
      expect(pusher.pushStep.mock.calls[0]?.[0].insertAfterStepId).toBe("server-4");
      expect(pusher.pushStep.mock.calls[1]?.[0].insertAfterStepId).toBe("server-4");
    });
  });

  describe("retries", () => {
    test("retries a failed step up to the capped attempt count and then leaves it failed", async () => {
      const pushStep = vi.fn().mockRejectedValue(new Error("network down"));
      const { drainer, repository, onStepFailed } = setup({ pushStep });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pushStep).toHaveBeenCalledTimes(3);
      expect(repository.markStepFailed).toHaveBeenCalledTimes(3);
      expect(onStepFailed).toHaveBeenCalledTimes(3);
      expect(drainer.getState().lastError).toBe("network down");
    });

    test("stops retrying after a successful retry", async () => {
      const pushStep = vi
        .fn()
        .mockRejectedValueOnce(new Error("transient"))
        .mockResolvedValue(undefined);
      const { drainer, repository, onDrainCompleted } = setup({ pushStep });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pushStep).toHaveBeenCalledTimes(2);
      expect(repository.markStepFailed).toHaveBeenCalledTimes(1);
      expect(onDrainCompleted).toHaveBeenCalled();
    });
  });

  describe("auth and user gating", () => {
    test("pauses without touching data when nobody is signed in", async () => {
      const { drainer, auth, pusher, onAuthLost } = setup({ userId: null });

      await drainer.drainAll();

      expect(pusher.pushStep).not.toHaveBeenCalled();
      expect(onAuthLost).toHaveBeenCalledTimes(1);
      expect(drainer.getState().isPaused).toBe(true);
      expect(auth.invalidate).toHaveBeenCalled();
    });

    test("skips sessions owned by another user", async () => {
      const { drainer, pusher, auth } = setup({ userId: "user-2" });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(auth.getUserId).toHaveBeenCalled();
      expect(pusher.pushStep).not.toHaveBeenCalled();
    });

    test("pauses on a 401 from the API instead of retrying the step", async () => {
      const pushStep = vi.fn().mockRejectedValue(createApiError(401));
      const { drainer, onAuthLost, repository } = setup({ pushStep });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pushStep).toHaveBeenCalledTimes(1);
      expect(onAuthLost).toHaveBeenCalledTimes(1);
      expect(repository.markStepFailed).not.toHaveBeenCalled();
      expect(drainer.getState().isPaused).toBe(true);
    });

    test("resumes draining once the user is signed in again", async () => {
      const first = setup({ userId: null });
      await first.drainer.drainAll();
      expect(first.drainer.getState().isPaused).toBe(true);

      first.auth.getUserId.mockResolvedValue("user-1");
      await first.drainer.drainAll();
      await waitForIdle(first.drainer);

      expect(first.drainer.getState().isPaused).toBe(false);
      expect(first.pusher.pushStep).toHaveBeenCalledTimes(1);
      expect(first.lifecycleStore.patch).toHaveBeenCalledWith({ isSignedOut: false });
    });
  });

  describe("deleted guides", () => {
    test.each([404, 409])("cancels the session's local data on a %s", async (status) => {
      const pushStep = vi.fn().mockRejectedValue(createApiError(status));
      const { drainer, repository, onGuideGone, onStepFailed } = setup({ pushStep });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(repository.deleteSessionData).toHaveBeenCalledWith("session-1");
      expect(onGuideGone).toHaveBeenCalledWith(expect.objectContaining({ id: "session-1" }));
      expect(onStepFailed).not.toHaveBeenCalled();
      expect(pushStep).toHaveBeenCalledTimes(1);
    });

    test("does not recreate the guide after it is gone", async () => {
      const pushStep = vi.fn().mockRejectedValue(createApiError(404));
      const { drainer, pusher } = setup({ pushStep });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pusher.ensureGuide).toHaveBeenCalledTimes(1);
    });
  });

  describe("kick", () => {
    test("queues the live session from the lifecycle", async () => {
      const { drainer, pusher } = setup();

      await drainer.kick();
      await waitForIdle(drainer);

      expect(pusher.pushStep).toHaveBeenCalledTimes(1);
    });

    test("does not queue while paused", async () => {
      const { drainer, auth, pusher } = setup({ userId: null });

      await drainer.drainAll();
      await drainer.kick();

      expect(auth.getUserId).toHaveBeenCalledTimes(1);
      expect(pusher.pushStep).not.toHaveBeenCalled();
    });
  });

  describe("countOutstanding", () => {
    test("counts pending and uploading steps for the signed-in user", async () => {
      const { drainer, repository } = setup();

      await expect(drainer.countOutstanding()).resolves.toBe(1);
      expect(repository.listSyncableSteps).toHaveBeenCalledWith({ userId: "user-1" });
    });

    test("falls back to every session when signed out so retained data still wakes the alarm", async () => {
      const { drainer, repository } = setup({ userId: null });

      await expect(drainer.countOutstanding()).resolves.toBe(1);
      expect(repository.listSessions).toHaveBeenCalled();
    });
  });

  describe("guide failures", () => {
    test("marks steps failed and retries when the guide cannot be resolved", async () => {
      const { drainer, pusher, repository } = setup();
      pusher.ensureGuide.mockRejectedValue(new Error("Local session has no guide to upload to"));

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(repository.markStepFailed).toHaveBeenCalledTimes(3);
      expect(drainer.getState().lastError).toBe("Local session has no guide to upload to");
    });

    test("treats a permanent auth error from the guide lookup as a pause", async () => {
      const { drainer, pusher, onAuthLost } = setup();
      pusher.ensureGuide.mockRejectedValue(new OutboxPermanentError("auth", "Unauthorized"));

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(onAuthLost).toHaveBeenCalledTimes(1);
      expect(drainer.getState().isPaused).toBe(true);
    });
  });
});
