import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "@repo/api-client";

import { createOutboxDrainer, findInsertAfterStepId } from "./outbox-drainer.service";
import { OutboxPermanentError } from "./outbox-pusher.service";
import {
  emptyOutboxCounts,
  type LocalSession,
  type LocalStep,
  type OutboxCounts,
  type RecordingLifecycleStore,
} from "@/models";
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

const isSyncable = (entry: LocalStep) =>
  entry.syncStatus === "pending" ||
  entry.syncStatus === "uploading" ||
  entry.syncStatus === "failed";

const countStatuses = (steps: readonly LocalStep[]): OutboxCounts => {
  const counts = { ...emptyOutboxCounts };
  for (const entry of steps) {
    counts[entry.syncStatus] += 1;
  }
  return counts;
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const setup = ({
  steps = [step()] as LocalStep[],
  userId = "user-1" as string | null,
  activeSession = session(),
  pushStep = vi.fn().mockResolvedValue(undefined),
  pushDeletion = vi.fn().mockResolvedValue("removed"),
  pendingDeletions = 0 as number,
} = {}) => {
  const sessions = [activeSession];
  const storedSteps = steps.map((entry) => ({ ...entry }));

  const sessionIdsForUser = (id: string) =>
    sessions.filter((entry) => entry.userId === id).map((entry) => entry.id);

  const repository = {
    getSession: vi.fn(async (id: string) => sessions.find((entry) => entry.id === id)),
    listSteps: vi.fn(async (sessionId: string) =>
      storedSteps
        .filter((entry) => entry.sessionId === sessionId)
        .sort((a, b) => a.stepIndex - b.stepIndex),
    ),
    listSyncableSteps: vi.fn(async (scope: { sessionId?: string; userId?: string }) => {
      const sessionIds = scope.sessionId
        ? [scope.sessionId]
        : sessionIdsForUser(scope.userId ?? "");
      return storedSteps
        .filter((entry) => sessionIds.includes(entry.sessionId) && isSyncable(entry))
        .sort((a, b) => a.stepIndex - b.stepIndex);
    }),
    listSessions: vi.fn(async () => [...sessions]),
    listSessionsByUserId: vi.fn(async (id: string) =>
      sessions.filter((entry) => entry.userId === id),
    ),
    markStepFailed: vi.fn(async (id: string, message: string) => {
      const target = storedSteps.find((entry) => entry.id === id);
      if (!target) {
        return;
      }
      target.syncStatus = "failed";
      target.retryCount += 1;
      target.lastError = message;
    }),
    getCounts: vi.fn(async (sessionId: string) =>
      countStatuses(storedSteps.filter((entry) => entry.sessionId === sessionId)),
    ),
    deleteSessionData: vi.fn(async (sessionId: string) => {
      const stepCount = storedSteps.filter((entry) => entry.sessionId === sessionId).length;
      for (let index = storedSteps.length - 1; index >= 0; index -= 1) {
        if (storedSteps[index]?.sessionId === sessionId) {
          storedSteps.splice(index, 1);
        }
      }
      const sessionIndex = sessions.findIndex((entry) => entry.id === sessionId);
      if (sessionIndex !== -1) {
        sessions.splice(sessionIndex, 1);
      }
      return {
        sessions: sessionIndex === -1 ? 0 : 1,
        steps: stepCount,
        blobs: stepCount * 2,
      };
    }),
  } as unknown as OutboxRepository;

  const pusher = {
    ensureGuide: vi.fn().mockResolvedValue(activeSession.guideId ?? "guide-new"),
    pushStep,
  };

  const deleter = {
    deleteStep: vi.fn().mockResolvedValue("removed"),
    pushDeletion,
    deleteGuide: vi.fn().mockResolvedValue("deleted"),
    countPendingDeletions: vi.fn().mockResolvedValue(pendingDeletions),
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
    deleter,
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
    deleter,
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
    test("pushes pending steps in stepIndex order without anchoring sequential appends", async () => {
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
      expect(pusher.pushStep.mock.calls.map(([input]) => input.insertAfterStepId)).toEqual([
        undefined,
        undefined,
      ]);
    });

    test("anchors a retried step before a step the server already has", async () => {
      const steps = [
        step({ id: "step-0", stepIndex: 0, serverStepId: "server-0", syncStatus: "synced" }),
        step({ id: "step-5", stepIndex: 5 }),
        step({ id: "step-8", stepIndex: 8, serverStepId: "server-8", syncStatus: "synced" }),
      ];
      const { drainer, pusher } = setup({ steps });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pusher.pushStep).toHaveBeenCalledWith(
        expect.objectContaining({
          step: expect.objectContaining({ id: "step-5" }),
          insertAfterStepId: "server-0",
        }),
      );
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
    test("pauses and keeps data when nobody is signed in", async () => {
      const { drainer, auth, pusher, onAuthLost, onDrainCompleted } = setup({ userId: null });

      await drainer.drainAll();

      expect(pusher.pushStep).not.toHaveBeenCalled();
      expect(onAuthLost).toHaveBeenCalledTimes(1);
      expect(onDrainCompleted).not.toHaveBeenCalled();
      expect(drainer.getState().isPaused).toBe(true);
      expect(auth.invalidate).toHaveBeenCalled();

      await drainer.drainAll();

      expect(onAuthLost).toHaveBeenCalledTimes(1);
    });

    test("skips sessions owned by another user", async () => {
      const { drainer, pusher, auth } = setup({ userId: "user-2" });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(auth.getUserId).toHaveBeenCalled();
      expect(pusher.ensureGuide).not.toHaveBeenCalled();
      expect(pusher.pushStep).not.toHaveBeenCalled();
    });

    test("pauses on a 401 from the API instead of retrying the step", async () => {
      const pushStep = vi.fn().mockRejectedValue(createApiError(401));
      const { drainer, onAuthLost, repository, onDrainCompleted } = setup({ pushStep });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pushStep).toHaveBeenCalledTimes(1);
      expect(onAuthLost).toHaveBeenCalledTimes(1);
      expect(onDrainCompleted).not.toHaveBeenCalled();
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
    test.each([404, 409])(
      "discards the session on a %s and never recreates the guide",
      async (status) => {
        const pushStep = vi.fn().mockRejectedValue(createApiError(status));
        const { drainer, repository, pusher, onGuideGone, onStepFailed } = setup({ pushStep });

        await drainer.drainAll();
        await waitForIdle(drainer);

        expect(repository.deleteSessionData).toHaveBeenCalledWith("session-1");
        expect(onGuideGone).toHaveBeenCalledWith(expect.objectContaining({ id: "session-1" }));
        expect(onStepFailed).not.toHaveBeenCalled();
        expect(pushStep).toHaveBeenCalledTimes(1);

        await drainer.drainAll();
        await waitForIdle(drainer);

        expect(pusher.ensureGuide).toHaveBeenCalledTimes(1);
        expect(pushStep).toHaveBeenCalledTimes(1);
        expect(onGuideGone).toHaveBeenCalledTimes(1);
      },
    );
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

    test("does not enqueue the same session while it is in flight", async () => {
      const started = deferred();
      const release = deferred();
      const pushStep = vi.fn(async () => {
        started.resolve();
        await release.promise;
      });
      const { drainer } = setup({ pushStep });

      void drainer.kick();
      await started.promise;
      void drainer.kick();
      drainer.kickSession("session-1");
      release.resolve();
      await waitForIdle(drainer);

      expect(pushStep).toHaveBeenCalledTimes(1);
    });
  });

  describe("countOutstanding", () => {
    test("returns zero when the outbox is idle", async () => {
      const steps = [
        step({ id: "step-0", syncStatus: "synced" }),
        step({ id: "step-1", stepIndex: 1, syncStatus: "failed" }),
      ];
      const { drainer, deleter } = setup({ steps });

      await expect(drainer.countOutstanding()).resolves.toBe(0);
      expect(deleter.countPendingDeletions).toHaveBeenCalledWith("user-1");
    });

    test("counts uploads plus pending server deletions", async () => {
      const steps = [
        step({ id: "step-0", syncStatus: "pending" }),
        step({ id: "step-1", stepIndex: 1, syncStatus: "uploading" }),
        step({ id: "step-2", stepIndex: 2, syncStatus: "failed" }),
      ];
      const { drainer } = setup({ steps, pendingDeletions: 2 });

      await expect(drainer.countOutstanding()).resolves.toBe(4);
    });

    test("counts retained sessions when signed out so the alarm keeps waking", async () => {
      const { drainer, repository } = setup({ userId: null });

      await expect(drainer.countOutstanding()).resolves.toBe(1);
      expect(repository.listSessions).toHaveBeenCalled();
    });
  });

  describe("deletions", () => {
    test("queues sessions that only hold a pending server delete", async () => {
      const deleted = step({
        id: "step-9",
        stepIndex: 9,
        syncStatus: "deleted",
        serverStepId: "server-9",
      });
      const { drainer, deleter, pusher, repository } = setup({ steps: [deleted] });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(repository.listSessionsByUserId).toHaveBeenCalledWith("user-1");
      expect(deleter.pushDeletion).toHaveBeenCalledWith(deleted);
      expect(pusher.ensureGuide).not.toHaveBeenCalled();
      expect(pusher.pushStep).not.toHaveBeenCalled();
    });

    test("leaves a failed delete for the next drain instead of looping in one", async () => {
      const deleted = step({
        id: "step-9",
        stepIndex: 9,
        syncStatus: "deleted",
        serverStepId: "server-9",
      });
      const pushDeletion = vi.fn().mockResolvedValue("retrying");
      const { drainer, onDrainCompleted } = setup({ steps: [deleted], pushDeletion });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pushDeletion).toHaveBeenCalledTimes(1);
      expect(onDrainCompleted).toHaveBeenCalled();

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pushDeletion).toHaveBeenCalledTimes(2);
    });

    test("pauses when a delete hits an auth failure", async () => {
      const deleted = step({
        id: "step-9",
        stepIndex: 9,
        syncStatus: "deleted",
        serverStepId: "server-9",
      });
      const pushDeletion = vi
        .fn()
        .mockRejectedValue(new OutboxPermanentError("auth", "Unauthorized"));
      const { drainer, onAuthLost, onDrainCompleted } = setup({ steps: [deleted], pushDeletion });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pushDeletion).toHaveBeenCalledTimes(1);
      expect(onAuthLost).toHaveBeenCalledTimes(1);
      expect(onDrainCompleted).not.toHaveBeenCalled();
      expect(drainer.getState().isPaused).toBe(true);
    });

    test("pushes uploads and deletions for the same session", async () => {
      const pending = step({ id: "step-1", stepIndex: 1 });
      const deleted = step({
        id: "step-0",
        stepIndex: 0,
        syncStatus: "deleted",
        serverStepId: "server-0",
      });
      const { drainer, pusher, deleter } = setup({ steps: [deleted, pending] });

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(pusher.pushStep).toHaveBeenCalledTimes(1);
      expect(deleter.pushDeletion).toHaveBeenCalledWith(deleted);
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
      const { drainer, pusher, onAuthLost, repository } = setup();
      pusher.ensureGuide.mockRejectedValue(new OutboxPermanentError("auth", "Unauthorized"));

      await drainer.drainAll();
      await waitForIdle(drainer);

      expect(onAuthLost).toHaveBeenCalledTimes(1);
      expect(repository.markStepFailed).not.toHaveBeenCalled();
      expect(drainer.getState().isPaused).toBe(true);
    });
  });
});
