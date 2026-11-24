import { describe, expect, test, vi } from "vitest";

import { createOutboxDiagnostics } from "./outbox-diagnostics.service";
import { emptyOutboxCounts, type OutboxCounts } from "@/models";

const counts = (overrides: Partial<OutboxCounts> = {}): OutboxCounts => ({
  ...emptyOutboxCounts,
  ...overrides,
});

const drainerState = {
  isPaused: false,
  isRunning: true,
  queued: 1,
  active: 1,
  lastError: null,
};

const setup = ({ sessionCounts = [] as OutboxCounts[], isDev = true } = {}) => {
  const sessions = sessionCounts.map((_, index) => ({ id: `session-${index + 1}` }));
  const repository = {
    listSessions: vi.fn().mockResolvedValue(sessions),
    getCounts: vi.fn(async (sessionId: string) => {
      const index = Number(sessionId.replace("session-", "")) - 1;
      return sessionCounts[index] ?? counts();
    }),
  };
  const drainer = { getState: vi.fn(() => drainerState) };

  const diagnostics = createOutboxDiagnostics({
    repository: repository as never,
    drainer: drainer as never,
    isDev,
  });

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

  test("reports zero counts when the outbox is idle", async () => {
    const { diagnostics } = setup();

    await expect(diagnostics.getState()).resolves.toEqual({
      sessions: 0,
      steps: counts(),
      drainer: drainerState,
    });
  });
});
