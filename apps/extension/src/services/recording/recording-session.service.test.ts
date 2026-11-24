import { describe, expect, test, vi } from "vitest";

import { createRecordingSessionService } from "./recording-session.service";
import type { LocalSession, OutboxLifecycle, RecordingLifecycleStore } from "@/models";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";

const NOW = new Date("2026-11-24T10:05:00.000Z");
const NOW_ISO = NOW.toISOString();
const FIVE_MINUTES = 5 * 60 * 1000;

const createLifecycleStore = (initial: OutboxLifecycle) => {
  let current = initial;

  const store = {
    get: vi.fn(async () => current),
    set: vi.fn(async (lifecycle: OutboxLifecycle) => {
      current = lifecycle;
    }),
    patch: vi.fn(async (changes: Partial<OutboxLifecycle>) => {
      current = { ...current, ...changes };
      return current;
    }),
  };

  return {
    store: store as unknown as RecordingLifecycleStore,
    getState: () => current,
  };
};

const session: LocalSession = {
  id: "session-1",
  userId: "user-1",
  guideId: "guide-1",
  clientGuideId: "client-1",
  startedAt: NOW_ISO,
  lastActivityAt: NOW_ISO,
  nextStepIndex: 0,
};

const createRepository = () => {
  const repository = {
    createSession: vi.fn().mockResolvedValue(session),
    getSession: vi.fn().mockResolvedValue(session),
    updateSession: vi.fn().mockResolvedValue(session),
    listSessions: vi.fn().mockResolvedValue([]),
    listSteps: vi.fn().mockResolvedValue([]),
    setSessionGuideId: vi.fn().mockResolvedValue(session),
  };

  return repository as unknown as OutboxRepository & typeof repository;
};

const setup = ({
  lifecycle = { status: "idle", isSignedOut: false } as OutboxLifecycle,
  repository = createRepository(),
}: {
  lifecycle?: OutboxLifecycle;
  repository?: ReturnType<typeof createRepository>;
} = {}) => {
  const { store, getState } = createLifecycleStore(lifecycle);
  const resolveUserId = vi.fn().mockResolvedValue("user-1");
  const createGuide = vi.fn().mockResolvedValue({ id: "guide-1" });
  const deleteGuide = vi.fn().mockResolvedValue(undefined);

  const service = createRecordingSessionService({
    lifecycleStore: store,
    repository,
    resolveUserId,
    createGuide,
    deleteGuide,
    now: () => NOW,
  });

  return { service, store, getState, repository, resolveUserId, createGuide, deleteGuide };
};

describe("recording session service", () => {
  describe("start", () => {
    test("persists pendingStart before creating the guide", async () => {
      const { service, getState, repository, createGuide } = setup();
      let pendingStartAtCreate: OutboxLifecycle["pendingStart"];

      createGuide.mockImplementation(async () => {
        pendingStartAtCreate = getState().pendingStart;
        return { id: "guide-1" };
      });

      await service.start();

      expect(pendingStartAtCreate).toEqual({
        clientGuideId: expect.any(String),
        startedAt: NOW_ISO,
      });
      expect(createGuide).toHaveBeenCalledWith({
        clientGuideId: pendingStartAtCreate?.clientGuideId,
        startedAt: NOW_ISO,
      });
      expect(repository.createSession).toHaveBeenCalledWith({
        userId: "user-1",
        guideId: "guide-1",
        clientGuideId: pendingStartAtCreate?.clientGuideId,
        startedAt: NOW_ISO,
      });
      expect(getState()).toEqual({
        status: "recording",
        isSignedOut: false,
        sessionId: "session-1",
        pendingStart: undefined,
      });
    });

    test("reuses pendingStart when a failed start is retried within five minutes", async () => {
      const { service, getState, createGuide, repository } = setup();
      createGuide
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce({ id: "guide-1" });

      await expect(service.start()).rejects.toThrow("offline");
      const firstPendingStart = getState().pendingStart;
      expect(firstPendingStart).toBeDefined();
      expect(getState().status).toBe("idle");

      await service.start();

      expect(createGuide).toHaveBeenLastCalledWith({
        clientGuideId: firstPendingStart?.clientGuideId,
        startedAt: firstPendingStart?.startedAt,
      });
      expect(repository.createSession).toHaveBeenCalledTimes(1);
      expect(getState().pendingStart).toBeUndefined();
    });

    test("replaces an expired pendingStart with a new client guide id", async () => {
      const expiredStartedAt = new Date(NOW.getTime() - FIVE_MINUTES - 1000).toISOString();
      const { service, getState, createGuide } = setup({
        lifecycle: {
          status: "idle",
          isSignedOut: false,
          pendingStart: { clientGuideId: "expired-client", startedAt: expiredStartedAt },
        },
      });
      let pendingStartAtCreate: OutboxLifecycle["pendingStart"];
      createGuide.mockImplementation(async () => {
        pendingStartAtCreate = getState().pendingStart;
        return { id: "guide-1" };
      });

      await service.start();

      expect(pendingStartAtCreate?.clientGuideId).not.toBe("expired-client");
      expect(createGuide).toHaveBeenCalledWith({
        clientGuideId: pendingStartAtCreate?.clientGuideId,
        startedAt: NOW_ISO,
      });
    });

    test("reuses an existing local session for the same client guide id", async () => {
      const { service, repository } = setup({
        lifecycle: {
          status: "idle",
          isSignedOut: false,
          pendingStart: { clientGuideId: "client-1", startedAt: NOW_ISO },
        },
      });
      const existingSession = { ...session, clientGuideId: "client-1" };
      repository.listSessions.mockResolvedValue([existingSession]);

      await service.start();

      expect(repository.createSession).not.toHaveBeenCalled();
      expect(repository.setSessionGuideId).not.toHaveBeenCalled();
      expect(repository.listSessions).toHaveBeenCalled();
    });

    test("does not create a local session when the user cannot be resolved", async () => {
      const { service, repository, resolveUserId, getState } = setup();
      resolveUserId.mockRejectedValue(new Error("unauthorized"));

      await expect(service.start()).rejects.toThrow("unauthorized");

      expect(repository.createSession).not.toHaveBeenCalled();
      expect(getState().pendingStart).toBeDefined();
    });
  });

  describe("stop", () => {
    test("deletes the guide when no steps were captured", async () => {
      const { service, repository, deleteGuide, getState } = setup({
        lifecycle: {
          status: "recording",
          isSignedOut: false,
          sessionId: session.id,
        },
      });
      repository.listSteps.mockResolvedValue([]);

      await service.stop();

      expect(repository.updateSession).toHaveBeenCalledWith(session.id, { stoppedAt: NOW_ISO });
      expect(deleteGuide).toHaveBeenCalledWith("guide-1");
      expect(repository.setSessionGuideId).toHaveBeenCalledWith(session.id, null);
      expect(getState().status).toBe("stopped");
    });

    test("keeps the guide when steps were captured", async () => {
      const { service, repository, deleteGuide } = setup({
        lifecycle: {
          status: "recording",
          isSignedOut: false,
          sessionId: session.id,
        },
      });
      repository.listSteps.mockResolvedValue([
        {
          id: "step-1",
          sessionId: session.id,
          guideId: "guide-1",
          stepIndex: 0,
          kind: "interaction",
          action: "click",
          url: "https://angular.dev",
          capturedAt: NOW_ISO,
          syncStatus: "pending",
          retryCount: 0,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        },
      ]);

      await service.stop();

      expect(deleteGuide).not.toHaveBeenCalled();
      expect(repository.setSessionGuideId).not.toHaveBeenCalled();
    });

    test("keeps local data when the empty guide delete fails", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { service, repository, deleteGuide, getState } = setup({
        lifecycle: {
          status: "recording",
          isSignedOut: false,
          sessionId: session.id,
        },
      });
      deleteGuide.mockRejectedValue(new Error("network"));

      await service.stop();

      expect(repository.updateSession).toHaveBeenCalled();
      expect(getState().status).toBe("stopped");
      expect(warn).toHaveBeenCalledWith(
        "[background] Failed to delete empty guide:",
        expect.any(Error),
      );
      warn.mockRestore();
    });
  });

  test("expire keeps local data and marks the lifecycle signed out", async () => {
    const { service, getState } = setup({
      lifecycle: { status: "recording", isSignedOut: false, sessionId: session.id },
    });

    await service.expire();

    expect(getState()).toEqual({
      status: "stopped",
      isSignedOut: true,
      sessionId: session.id,
    });
  });
});
