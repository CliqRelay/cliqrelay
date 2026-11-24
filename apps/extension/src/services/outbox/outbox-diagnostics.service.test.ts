import { beforeEach, describe, expect, test, vi } from "vitest";

import { createOutboxDiagnostics } from "./outbox-diagnostics.service";

const setup = () => {
  const repository = {
    listSessions: vi.fn().mockResolvedValue([{ id: "session-1" }, { id: "session-2" }]),
    getCounts: vi
      .fn()
      .mockResolvedValueOnce({ pending: 2, uploading: 1, synced: 3, failed: 1, deleted: 0 })
      .mockResolvedValueOnce({ pending: 1, uploading: 0, synced: 0, failed: 2, deleted: 1 }),
  } as never;

  const drainer = {
    getState: vi.fn().mockReturnValue({
      isPaused: false,
      isRunning: true,
      queued: 1,
      active: 1,
      lastError: null,
    }),
  } as never;

  const diagnostics = createOutboxDiagnostics({ repository, drainer });

  return { diagnostics, repository, drainer };
};

describe("outbox diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("reports session and step counts with the drainer state", async () => {
    const { diagnostics } = setup();

    await expect(diagnostics.getState()).resolves.toEqual({
      sessions: 2,
      steps: { pending: 3, uploading: 1, synced: 3, failed: 3, deleted: 1 },
      drainer: {
        isPaused: false,
        isRunning: true,
        queued: 1,
        active: 1,
        lastError: null,
      },
    });
  });
});
