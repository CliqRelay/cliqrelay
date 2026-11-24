import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "@repo/api-client";

import { createSessionManager } from "./session-manager";
import type {
  LocalSession,
  OutboxLifecycle,
  RecordingLifecycleStore,
  SidePanelCommand,
} from "@/models";
import type { GetSettings, UpdateSettings } from "@/services/settings";

const NOW = new Date().toISOString();

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

type SessionManagerDeps = Parameters<typeof createSessionManager>[0];

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

type SetupOptions = {
  lifecycle?: OutboxLifecycle;
  activeSession?: LocalSession;
  userId?: string | null;
  failedRetried?: number;
};

const setup = ({
  lifecycle = { status: "stopped", sessionId: "session-1", isSignedOut: false },
  activeSession = session(),
  userId = "user-1",
  failedRetried = 2,
}: SetupOptions = {}) => {
  const { store: lifecycleStore, read: readLifecycle } = createLifecycleStore(lifecycle);

  const recording: SessionManagerDeps["recording"] = {
    getSnapshot: vi
      .fn<SessionManagerDeps["recording"]["getSnapshot"]>()
      .mockReturnValue({ status: "idle" }),
    start: vi
      .fn<SessionManagerDeps["recording"]["start"]>()
      .mockReturnValue({ status: "recording" }),
    pause: vi.fn<SessionManagerDeps["recording"]["pause"]>().mockReturnValue({ status: "paused" }),
    resume: vi
      .fn<SessionManagerDeps["recording"]["resume"]>()
      .mockReturnValue({ status: "recording" }),
    stop: vi.fn<SessionManagerDeps["recording"]["stop"]>().mockReturnValue({ status: "stopped" }),
    restore: vi
      .fn<SessionManagerDeps["recording"]["restore"]>()
      .mockImplementation((status) => ({ status })),
  };

  const repository: SessionManagerDeps["repository"] = {
    getSession: vi
      .fn<SessionManagerDeps["repository"]["getSession"]>()
      .mockResolvedValue(activeSession),
    createSession: vi
      .fn<SessionManagerDeps["repository"]["createSession"]>()
      .mockImplementation(async (input) =>
        session({ userId: input.userId, guideId: input.guideId }),
      ),
    updateSession: vi
      .fn<SessionManagerDeps["repository"]["updateSession"]>()
      .mockResolvedValue(activeSession),
    setSessionGuideId: vi
      .fn<SessionManagerDeps["repository"]["setSessionGuideId"]>()
      .mockResolvedValue(activeSession),
    listSessions: vi
      .fn<SessionManagerDeps["repository"]["listSessions"]>()
      .mockResolvedValue([activeSession]),
    listSteps: vi.fn<SessionManagerDeps["repository"]["listSteps"]>().mockResolvedValue([]),
    deleteSessionData: vi
      .fn<SessionManagerDeps["repository"]["deleteSessionData"]>()
      .mockResolvedValue({ sessions: 1, steps: 1, blobs: 1 }),
    discardForUser: vi
      .fn<SessionManagerDeps["repository"]["discardForUser"]>()
      .mockResolvedValue({ sessions: 1, steps: 1, blobs: 1 }),
  };

  const drainer: SessionManagerDeps["drainer"] = {
    kick: vi.fn<SessionManagerDeps["drainer"]["kick"]>().mockResolvedValue(undefined),
    kickSession: vi.fn<SessionManagerDeps["drainer"]["kickSession"]>(),
    drainAll: vi.fn<SessionManagerDeps["drainer"]["drainAll"]>().mockResolvedValue(undefined),
    pause: vi.fn<SessionManagerDeps["drainer"]["pause"]>(),
  };
  const deleter: SessionManagerDeps["deleter"] = {
    deleteStep: vi
      .fn<SessionManagerDeps["deleter"]["deleteStep"]>()
      .mockResolvedValue("removed"),
    deleteGuide: vi
      .fn<SessionManagerDeps["deleter"]["deleteGuide"]>()
      .mockResolvedValue("deleted"),
  };
  const scheduler: SessionManagerDeps["scheduler"] = {
    start: vi.fn<SessionManagerDeps["scheduler"]["start"]>().mockResolvedValue(undefined),
    sync: vi.fn<SessionManagerDeps["scheduler"]["sync"]>().mockResolvedValue("stopped"),
  };
  const auth: SessionManagerDeps["auth"] = {
    getUserId: vi.fn<SessionManagerDeps["auth"]["getUserId"]>().mockResolvedValue(userId),
  };
  const stepState: SessionManagerDeps["stepState"] = {
    retryFailedSteps: vi
      .fn<SessionManagerDeps["stepState"]["retryFailedSteps"]>()
      .mockResolvedValue(failedRetried),
    discardUnsyncedSteps: vi
      .fn<SessionManagerDeps["stepState"]["discardUnsyncedSteps"]>()
      .mockResolvedValue(0),
  };
  const badge: SessionManagerDeps["badge"] = {
    refresh: vi.fn<SessionManagerDeps["badge"]["refresh"]>().mockResolvedValue(undefined),
  };
  const getSettings = vi.fn<GetSettings>().mockResolvedValue(settings);
  const updateSettings = vi.fn<UpdateSettings>().mockResolvedValue(updatedSettings);

  const manager = createSessionManager({
    recording,
    lifecycleStore,
    repository,
    getSettings,
    updateSettings,
    drainer,
    deleter,
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
    deleter,
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
      const { manager, getSettings, updateSettings } = setup();
      getSettings.mockResolvedValueOnce(settings).mockResolvedValueOnce(updatedSettings);

      await expect(
        manager.handleSidePanelCommand(command({ command: "get_settings" })),
      ).resolves.toEqual(settings);
      await expect(
        manager.handleSidePanelCommand(
          command({
            command: "update_settings",
            payload: { capturePreferences: { captureClicks: false, captureInput: true } },
          }),
        ),
      ).resolves.toEqual(updatedSettings);

      expect(updateSettings).toHaveBeenCalledWith({
        capturePreferences: { captureClicks: false, captureInput: true },
      });
      expect(getSettings).toHaveBeenCalledTimes(2);
    });
  });

  describe("dismiss_step", () => {
    test("removes the local step through the deleter and refreshes counts", async () => {
      const { manager, deleter, badge, scheduler } = setup();

      await manager.handleSidePanelCommand(command({ command: "dismiss_step", stepId: "step-1" }));

      expect(deleter.deleteStep).toHaveBeenCalledWith("step-1");
      expect(badge.refresh).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
    });

    test("ignores a command without a step id", async () => {
      const { manager, deleter } = setup();

      await manager.handleSidePanelCommand(command({ command: "dismiss_step" }));

      expect(deleter.deleteStep).not.toHaveBeenCalled();
    });
  });

  describe("delete_step", () => {
    test("deletes through the local-first deleter and refreshes counts", async () => {
      const { manager, deleter, badge, scheduler } = setup();

      await manager.handleSidePanelCommand(command({ command: "delete_step", stepId: "step-1" }));

      expect(deleter.deleteStep).toHaveBeenCalledWith("step-1");
      expect(badge.refresh).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
    });

    test("ignores a command without a step id", async () => {
      const { manager, deleter } = setup();

      await manager.handleSidePanelCommand(command({ command: "delete_step" }));

      expect(deleter.deleteStep).not.toHaveBeenCalled();
    });
  });

  describe("delete_guide", () => {
    test("stops recording, discards unsynced captures, deletes the server guide and clears the session", async () => {
      const {
        manager,
        recording,
        deleter,
        stepState,
        repository,
        badge,
        scheduler,
        readLifecycle,
      } = setup({
        lifecycle: { status: "recording", sessionId: "session-1", isSignedOut: false },
      });

      await manager.handleSidePanelCommand(
        command({ command: "delete_guide", guideId: "guide-1" }),
      );

      expect(recording.stop).toHaveBeenCalled();
      expect(stepState.discardUnsyncedSteps).toHaveBeenCalledWith("session-1");
      expect(deleter.deleteGuide).toHaveBeenCalledWith("guide-1");
      expect(repository.deleteSessionData).toHaveBeenCalledWith("session-1");
      expect(readLifecycle()).toMatchObject({
        status: "idle",
        sessionId: undefined,
        pendingStart: undefined,
      });
      expect(badge.refresh).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
    });

    test("deletes the guide of the local session when no id is sent", async () => {
      const { manager, deleter } = setup();

      await manager.handleSidePanelCommand(command({ command: "delete_guide" }));

      expect(deleter.deleteGuide).toHaveBeenCalledWith("guide-1");
    });

    test("ignores a guide that is not the local session's guide", async () => {
      const { manager, deleter, recording } = setup();

      await manager.handleSidePanelCommand(
        command({ command: "delete_guide", guideId: "some-persisted-guide" }),
      );

      expect(deleter.deleteGuide).not.toHaveBeenCalled();
      expect(recording.stop).not.toHaveBeenCalled();
    });

    test("does nothing when there is no local session", async () => {
      const { manager, deleter, recording } = setup({
        lifecycle: { status: "idle", isSignedOut: false },
      });

      await manager.handleSidePanelCommand(
        command({ command: "delete_guide", guideId: "guide-1" }),
      );

      expect(deleter.deleteGuide).not.toHaveBeenCalled();
      expect(recording.stop).not.toHaveBeenCalled();
    });

    test("keeps the stopped session when the server delete fails", async () => {
      const { manager, deleter, repository, readLifecycle, badge } = setup({
        lifecycle: { status: "recording", sessionId: "session-1", isSignedOut: false },
      });
      deleter.deleteGuide.mockRejectedValue(new Error("network down"));

      await expect(
        manager.handleSidePanelCommand(command({ command: "delete_guide", guideId: "guide-1" })),
      ).rejects.toThrow("network down");

      expect(repository.deleteSessionData).not.toHaveBeenCalled();
      expect(readLifecycle()).toMatchObject({ status: "stopped", sessionId: "session-1" });
      expect(badge.refresh).not.toHaveBeenCalled();
    });
  });

  describe("retry_failed", () => {
    test("retries one session and kicks it", async () => {
      const { manager, stepState, drainer, badge, scheduler } = setup();

      await manager.handleSidePanelCommand(
        command({ command: "retry_failed", sessionId: "session-1" }),
      );

      expect(stepState.retryFailedSteps).toHaveBeenCalledWith({ sessionId: "session-1" });
      expect(drainer.kickSession).toHaveBeenCalledWith("session-1");
      expect(badge.refresh).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
    });

    test("retries every failed step of the current user and drains", async () => {
      const { manager, stepState, drainer, auth, scheduler } = setup();

      await manager.handleSidePanelCommand(command({ command: "retry_failed" }));

      expect(auth.getUserId).toHaveBeenCalled();
      expect(stepState.retryFailedSteps).toHaveBeenCalledWith({ userId: "user-1" });
      expect(drainer.drainAll).toHaveBeenCalled();
      expect(scheduler.sync).toHaveBeenCalled();
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
      const { manager, recording, drainer, badge, scheduler, readLifecycle, repository } = setup({
        lifecycle: { status: "recording", sessionId: "session-1", isSignedOut: false },
      });

      await manager.handleSessionExpired();
      await manager.handleSessionExpired();

      expect(recording.stop).toHaveBeenCalledTimes(1);
      expect(drainer.pause).toHaveBeenCalledTimes(1);
      expect(badge.refresh).toHaveBeenCalledTimes(1);
      expect(scheduler.sync).toHaveBeenCalledTimes(1);
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

    test("resumes draining when recording starts again after a sign-out", async () => {
      const { manager, drainer, readLifecycle } = setup({
        lifecycle: { status: "stopped", sessionId: "session-1", isSignedOut: false },
      });

      await manager.handleSessionExpired();
      expect(readLifecycle().isSignedOut).toBe(true);
      expect(drainer.pause).toHaveBeenCalled();

      await manager.handleSidePanelCommand(command({ command: "start_recording" }));

      expect(readLifecycle()).toMatchObject({ status: "recording", isSignedOut: false });
      expect(drainer.drainAll).toHaveBeenCalled();
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
