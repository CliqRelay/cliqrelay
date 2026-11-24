import { describe, expect, test, vi } from "vitest";

import { createOutboxDiagnostics } from "./outbox-diagnostics.service";
import { emptyOutboxCounts, type LocalSession, type OutboxCounts } from "@/models";

type DiagnosticsDeps = Parameters<typeof createOutboxDiagnostics>[0];
type DrainerState = ReturnType<DiagnosticsDeps["drainer"]["getState"]>;

const NOW = "2026-11-24T10:00:00.000Z";

const counts = (overrides: Partial<OutboxCounts> = {}): OutboxCounts => ({
  ...emptyOutboxCounts,
  ...overrides,
});

const session = (index: number): LocalSession => ({
  id: `session-${index + 1}`,
  userId: "user-1",
  guideId: null,
  clientGuideId: `client-guide-${index + 1}`,
  startedAt: NOW,
  lastActivityAt: NOW,
  nextStepIndex: 0,
});

const drainerState: DrainerState = {
  isPaused: false,
  isRunning: true,
  queued: 1,
  active: 1,
  lastError: null,
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

type SetupOptions = {
  sessionCounts?: OutboxCounts[];
  isDev?: boolean;
};

const setup = ({ sessionCounts = [], isDev = true }: SetupOptions = {}) => {
  const sessions = sessionCounts.map((_, index) => session(index));

  const listSessions = vi
    .fn<DiagnosticsDeps["repository"]["listSessions"]>()
    .mockResolvedValue(sessions);

  const getCounts = vi.fn<DiagnosticsDeps["repository"]["getCounts"]>(async (sessionId) => {
    const index = Number(sessionId.replace("session-", "")) - 1;
    return sessionCounts[index] ?? counts();
  });

  const repository = { listSessions, getCounts } satisfies DiagnosticsDeps["repository"];

  const getState = vi.fn<DiagnosticsDeps["drainer"]["getState"]>().mockReturnValue(drainerState);
  const drainer = { getState } satisfies DiagnosticsDeps["drainer"];

  const diagnostics = createOutboxDiagnostics({ repository, drainer, isDev });

  return { diagnostics, repository, drainer };
};

describe("outbox diagnostics", () => {
  test("returns nothing outside a developer build", async () => {
    const { diagnostics, repository, drainer } = setup({ isDev: false });

    await expect(diagnostics.getState()).resolves.toBeNull();
    expect(repository.listSessions).not.toHaveBeenCalled();
    expect(drainer.getState).not.toHaveBeenCalled();
  });

  test("aggregates step counts across sessions with the drainer state", async () => {
    const { diagnostics, repository } = setup({
      sessionCounts: [
        counts({ pending: 2, uploading: 1, synced: 3, failed: 1 }),
        counts({ pending: 1, failed: 2, deleted: 1 }),
      ],
    });

    await expect(diagnostics.getState()).resolves.toEqual({
      sessions: 2,
      steps: counts({ pending: 3, uploading: 1, synced: 3, failed: 3, deleted: 1 }),
      drainer: drainerState,
    });
    expect(repository.getCounts).toHaveBeenCalledTimes(2);
  });

  test("loads session counts in parallel", async () => {
    const { diagnostics, repository } = setup({
      sessionCounts: [counts(), counts()],
    });
    const gate = deferred();

    repository.getCounts.mockImplementation(async () => {
      await gate.promise;
      return counts();
    });

    const pending = diagnostics.getState();
    await vi.waitFor(() => expect(repository.getCounts).toHaveBeenCalledTimes(2));
    gate.resolve();

    await expect(pending).resolves.toEqual({
      sessions: 2,
      steps: counts(),
      drainer: drainerState,
    });
  });

  test("reports zero counts when the outbox is idle", async () => {
    const { diagnostics } = setup();

    await expect(diagnostics.getState()).resolves.toEqual({
      sessions: 0,
      steps: counts(),
      drainer: drainerState,
    });
  });
});
