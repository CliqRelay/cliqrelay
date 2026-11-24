import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "@repo/api-client";

import { createSessionManager } from "./session-manager";
import type {
  LocalSession,
  OutboxLifecycle,
  RecordingLifecycleStore,
  RecordingStateMachine,
  SidePanelCommand,
} from "@/models";

const NOW = "2026-11-24T10:00:00.000Z";

const settings = {
  capturePreferences: { captureClicks: true, captureInput: true },
};
const updatedSettings = {
  capturePreferences: { captureClicks: false, captureInput: true },
};

const { apiMock, authulaMock } = vi.hoisted(() => ({
  apiMock: {
    guides: {
      createGuide: vi.fn(),
      deleteGuide: vi.fn(),
    },
  },
  authulaMock: {
    core: { getMe: vi.fn() },
  },
}));

vi.mock("@repo/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/api-client")>();
  return { ...actual, api: apiMock };
});
vi.mock("@/lib/authula-client", () => ({ authulaClient: authulaMock }));
vi.mock("@/lib/active-team", () => ({ getActiveTeamId: async () => "team-1" }));
vi.mock("@/lib/csrf", () => ({ withCsrf: async () => ({}) }));

const session = (overrides: Partial<LocalSession> = {}): LocalSession => ({
  id: "session-1",
  userId: "user-1",
  guideId: "guide-1",
  clientGuideId: "client-guide-1",
  startedAt: NOW,
  lastActivityAt: NOW,
  nextStepIndex: 2,
  ...overrides,
});

const createLifecycleStore = (initial: OutboxLifecycle) => {
  let value = initial;

  const store: RecordingLifecycleStore = {
    get: async () => value,
    set: async (next) => {
      value = next;
    },
    patch: async (changes) => {
      value = { ...value, ...changes };
      return value;
    },
  };

  return { store, read: () => value };
};

const setup = ({
  lifecycle = { status: "stopped", sessionId: "session-1", isSignedOut: false } as OutboxLifecycle,
  activeSession = session(),
  userId = "user-1" as string | null,
  failedRetried = 2,
} = {}) => {
  const { store: lifecycleStore, read: readLifecycle } = createLifecycleStore(lifecycle);

  const recording = {
    getSnapshot: vi.fn().mockReturnValue({ status: "idle" }),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    restore: vi.fn(),
  } as unknown as RecordingStateMachine;

  const repository = {
    getSession: vi.fn().mockResolvedValue(activeSession),
    createSession: vi.fn(async (input: { userId: string; guideId: string }) =>
      session({ userId: input.userId, guideId: input.guideId }),
    ),
    updateSession: vi.fn().mockResolvedValue(activeSession),
    setSessionGuideId: vi.fn().mockResolvedValue(activeSession),
    listSessions: vi.fn().mockResolvedValue([activeSession]),
    listSteps: vi.fn().mockResolvedValue([]),
    removeStep: vi.fn().mockResolvedValue(undefined),
    deleteSessionData: vi.fn().mockResolvedValue({ sessions: 1, steps: 1, blobs: 1 }),
    discardForUser: vi.fn().mockResolvedValue({ sessions: 1, steps: 1, blobs: 1 }),
  };

  const drainer = {
    kick: vi.fn().mockResolvedValue(undefined),
    kickSession: vi.fn(),
    drainAll: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  };
  const scheduler = {
    start: vi.fn().mockResolvedValue(undefined),
    sync: vi.fn().mockResolvedValue(undefined),
  };
  const auth = { getUserId: vi.fn().mockResolvedValue(userId) };
  const stepState = { retryFailedSteps: vi.fn().mockResolvedValue(failedRetried) };
  const badge = { refresh: vi.fn().mockResolvedValue(undefined) };
  const getSettings = vi.fn().mockResolvedValue(settings);
  const updateSettings = vi.fn().mockResolvedValue(updatedSettings);

  const manager = createSessionManager({
    recording,
    lifecycleStore,
    repository: repository as never,
    getSettings,
    updateSettings,
    drainer,
    scheduler,
    auth,
    stepState,
    badge,
  });

  return {
    manager,
    recording,
    repository,
    drainer,
    scheduler,
    auth,
    stepState,
    badge,
    getSettings,
    updateSettings,
    readLifecycle,
  };
};

const command = (overrides: Partial<SidePanelCommand>): SidePanelCommand => ({
  type: "cliqrelay.sidepanel-command",
  command: "dismiss_step",
  ...overrides,
});

describe("session manager commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authulaMock.core.getMe.mockResolvedValue({ user: { id: "user-1" } });
    apiMock.guides.createGuide.mockResolvedValue({ guide: { id: "guide-created" } });
    apiMock.guides.deleteGuide.mockResolvedValue({});
  });

  describe("recording", () => {
    test("start creates the guide, starts recording, arms the alarm and drains", async () => {
      const { manager, recording, scheduler, drainer, readLifecycle } = setup({
        lifecycle: {
          status: "idle",
          isSignedOut: false,
          pendingStart: { clientGuideId: "client-guide-1", startedAt: NOW },
        },
      });

      await manager.handleSidePanelCommand(command({ command: "start_recording" }));

      expect(apiMock.guides.createGuide).toHaveBeenCalledWith(
        expect.objectContaining({ clientGuideId: "client-guide-1", teamId: "team-1" }),
        {},
      );
      expect(recording.start).toHaveBeenCalled();
      expect(scheduler.start).toHaveBeenCalled();
      expect(drainer.drainAll).toHaveBeenCalled();
      expect(readLifecycle()).toMatchObject({ status: "recording", sessionId: "session-1" });
    });

    test("marks the lifecycle signed out when the guide cannot be created without auth", async () => {
      const { manager, recording, drainer, readLifecycle } = setup({
        lifecycle: {
          status: "idle",
          isSignedOut: false,
          pendingStart: { clientGuideId: "client-guide-1", startedAt: NOW },
        },
      });
      apiMock.guides.createGuide.mockRejectedValue(
        new ApiError("Unauthorized", 401, {}, new Headers()),
      );

      await expect(
        manager.handleSidePanelCommand(command({ command: "start_recording" })),
      ).rejects.toThrow("Unauthorized");

      expect(recording.start).not.toHaveBeenCalled();
      expect(drainer.pause).toHaveBeenCalled();
      expect(readLifecycle().isSignedOut).toBe(true);
    });

    test("stop marks the session stopped, kicks the drainer and re-syncs the alarm", async () => {
      const { manager, recording, repository, drainer, scheduler, readLifecycle } = setup();

      await manager.handleSidePanelCommand(command({ command: "stop_recording" }));

      expect(recording.stop).toHaveBeenCalled();
      expect(repository.updateSession).toHaveBeenCalledWith("session-1", {
        stoppedAt: expect.any(String),
      });
      expect(drainer.kick).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
      expect(readLifecycle().status).toBe("stopped");
    });

    test("pause and resume only touch the lifecycle and state machine", async () => {
      const { manager, recording, readLifecycle } = setup({
        lifecycle: { status: "recording", sessionId: "session-1", isSignedOut: false },
      });

      await manager.handleSidePanelCommand(command({ command: "pause_recording" }));
      expect(recording.pause).toHaveBeenCalled();
      expect(readLifecycle().status).toBe("paused");

      await manager.handleSidePanelCommand(command({ command: "resume_recording" }));
      expect(recording.resume).toHaveBeenCalled();
      expect(readLifecycle().status).toBe("recording");
    });
  });

  describe("settings", () => {
    test("returns the stored settings", async () => {
      const { manager, getSettings } = setup();

      await expect(
        manager.handleSidePanelCommand(command({ command: "get_settings" })),
      ).resolves.toEqual(settings);
      expect(getSettings).toHaveBeenCalled();
    });

    test("persists an update and returns the merged settings", async () => {
      const { manager, updateSettings } = setup();

      await manager.handleSidePanelCommand(
        command({
          command: "update_settings",
          payload: { capturePreferences: { captureClicks: false, captureInput: true } },
        }),
      );

      expect(updateSettings).toHaveBeenCalledWith({
        capturePreferences: { captureClicks: false, captureInput: true },
      });
    });
  });

  describe("dismiss_step", () => {
    test("removes the local step and refreshes the badge and alarm", async () => {
      const { manager, repository, badge, scheduler } = setup();

      await manager.handleSidePanelCommand(command({ command: "dismiss_step", stepId: "step-1" }));

      expect(repository.removeStep).toHaveBeenCalledWith("step-1");
      expect(badge.refresh).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
    });

    test("ignores a command without a step id", async () => {
      const { manager, repository } = setup();

      await manager.handleSidePanelCommand(command({ command: "dismiss_step" }));

      expect(repository.removeStep).not.toHaveBeenCalled();
    });
  });

  describe("retry_failed", () => {
    test("retries one session and kicks it", async () => {
      const { manager, stepState, drainer, badge } = setup();

      await manager.handleSidePanelCommand(
        command({ command: "retry_failed", sessionId: "session-1" }),
      );

      expect(stepState.retryFailedSteps).toHaveBeenCalledWith({ sessionId: "session-1" });
      expect(drainer.kickSession).toHaveBeenCalledWith("session-1");
      expect(badge.refresh).toHaveBeenCalled();
    });

    test("retries every failed step of the current user and drains", async () => {
      const { manager, stepState, drainer, auth } = setup();

      await manager.handleSidePanelCommand(command({ command: "retry_failed" }));

      expect(auth.getUserId).toHaveBeenCalled();
      expect(stepState.retryFailedSteps).toHaveBeenCalledWith({ userId: "user-1" });
      expect(drainer.drainAll).toHaveBeenCalled();
    });

    test("does nothing when signed out", async () => {
      const { manager, stepState, drainer } = setup({ userId: null });

      await manager.handleSidePanelCommand(command({ command: "retry_failed" }));

      expect(stepState.retryFailedSteps).not.toHaveBeenCalled();
      expect(drainer.drainAll).not.toHaveBeenCalled();
    });
  });

  describe("discard_session", () => {
    test("deletes the session and stops it when it is live", async () => {
      const { manager, repository, recording, badge, scheduler, readLifecycle } = setup();

      await manager.handleSidePanelCommand(
        command({ command: "discard_session", sessionId: "session-1" }),
      );

      expect(repository.deleteSessionData).toHaveBeenCalledWith("session-1");
      expect(recording.stop).toHaveBeenCalled();
      expect(readLifecycle()).toMatchObject({ status: "stopped", sessionId: undefined });
      expect(badge.refresh).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
    });

    test("leaves an unrelated live session alone", async () => {
      const { manager, recording } = setup({
        lifecycle: { status: "recording", sessionId: "session-2", isSignedOut: false },
      });

      await manager.handleSidePanelCommand(
        command({ command: "discard_session", sessionId: "session-1" }),
      );

      expect(recording.stop).not.toHaveBeenCalled();
    });
  });

  describe("discard_user_data", () => {
    test("clears only the current user's data", async () => {
      const { manager, repository, auth, recording, badge } = setup();

      await manager.handleSidePanelCommand(command({ command: "discard_user_data" }));

      expect(auth.getUserId).toHaveBeenCalled();
      expect(repository.discardForUser).toHaveBeenCalledWith("user-1");
      expect(recording.stop).toHaveBeenCalled();
      expect(badge.refresh).toHaveBeenCalled();
    });

    test("does nothing when signed out", async () => {
      const { manager, repository } = setup({ userId: null });

      await manager.handleSidePanelCommand(command({ command: "discard_user_data" }));

      expect(repository.discardForUser).not.toHaveBeenCalled();
    });
  });

  describe("auth expiry", () => {
    test("stops recording, keeps local data and pauses the drainer once", async () => {
      const { manager, recording, drainer, badge, readLifecycle, repository } = setup({
        lifecycle: { status: "recording", sessionId: "session-1", isSignedOut: false },
      });

      await manager.handleSessionExpired();
      await manager.handleSessionExpired();

      expect(recording.stop).toHaveBeenCalledTimes(1);
      expect(drainer.pause).toHaveBeenCalledTimes(1);
      expect(badge.refresh).toHaveBeenCalledTimes(1);
      expect(repository.deleteSessionData).not.toHaveBeenCalled();
      expect(repository.discardForUser).not.toHaveBeenCalled();
      expect(readLifecycle()).toMatchObject({ status: "stopped", isSignedOut: true });
    });

    test("keeps a stopped session stopped and only flags the sign-out", async () => {
      const { manager, recording, drainer, readLifecycle } = setup({
        lifecycle: { status: "stopped", sessionId: "session-1", isSignedOut: false },
      });

      await manager.handleSessionExpired();

      expect(recording.stop).not.toHaveBeenCalled();
      expect(drainer.pause).toHaveBeenCalled();
      expect(readLifecycle()).toMatchObject({ status: "stopped", isSignedOut: true });
    });
  });

  describe("guide gone", () => {
    test("stops the live session without touching other sessions", async () => {
      const { manager, recording, badge, scheduler, readLifecycle } = setup({
        lifecycle: { status: "recording", sessionId: "session-1", isSignedOut: false },
      });

      await manager.handleGuideGone("session-1");

      expect(recording.stop).toHaveBeenCalled();
      expect(readLifecycle()).toMatchObject({ status: "stopped", sessionId: undefined });
      expect(badge.refresh).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
    });

    test("ignores a session that is not live", async () => {
      const { manager, recording } = setup({
        lifecycle: { status: "stopped", sessionId: "session-2", isSignedOut: false },
      });

      await manager.handleGuideGone("session-1");

      expect(recording.stop).not.toHaveBeenCalled();
    });
  });
});
