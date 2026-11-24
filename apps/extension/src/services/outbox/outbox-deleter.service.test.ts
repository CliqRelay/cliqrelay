import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError } from "@repo/api-client";

import { createOutboxDeleter } from "./outbox-deleter.service";
import type { OutboxStepStateRepository } from "./outbox-step-state.repository";
import type { OutboxRepository } from "./outbox.repository";
import type { LocalStep, OutboxApi } from "@/models";

const NOW = new Date("2026-11-24T10:00:00.000Z");

const step = (overrides: Partial<LocalStep> = {}): LocalStep => ({
  id: "step-1",
  sessionId: "session-1",
  guideId: "guide-1",
  stepIndex: 0,
  kind: "interaction",
  action: "click",
  url: "https://angular.dev",
  capturedAt: NOW.toISOString(),
  syncStatus: "synced",
  retryCount: 0,
  serverStepId: "server-step-1",
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const createApiError = (status: number) => new ApiError("boom", status, {}, new Headers());

const setup = ({ activeStep = step() }: { activeStep?: LocalStep | null } = {}) => {
  const repository: Pick<OutboxRepository, "removeStep"> = {
    removeStep: vi.fn().mockResolvedValue(undefined),
  };

  const countPendingDeletions = vi.fn().mockResolvedValue(0);

  const stepState: Pick<
    OutboxStepStateRepository,
    "getStep" | "markStepDeleted" | "countPendingDeletions"
  > = {
    getStep: vi.fn().mockResolvedValue(activeStep ?? undefined),
    markStepDeleted: vi.fn().mockResolvedValue(undefined),
    countPendingDeletions,
  };

  const api: Pick<OutboxApi, "deleteStep" | "deleteGuide"> = {
    deleteStep: vi.fn().mockResolvedValue(undefined),
    deleteGuide: vi.fn().mockResolvedValue(undefined),
  };

  const log = vi.fn();

  const deleter = createOutboxDeleter({
    repository,
    stepState,
    api,
    now: () => NOW,
    log,
  });

  return { deleter, repository, stepState, api, log, countPendingDeletions };
};

describe("outbox deleter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deleteStep", () => {
    test("removes a local-only step without calling the API", async () => {
      const { deleter, repository, api, stepState } = setup({
        activeStep: step({ syncStatus: "pending", serverStepId: undefined }),
      });

      await expect(deleter.deleteStep("step-1")).resolves.toBe("removed");

      expect(api.deleteStep).not.toHaveBeenCalled();
      expect(stepState.markStepDeleted).not.toHaveBeenCalled();
      expect(repository.removeStep).toHaveBeenCalledWith("step-1");
    });

    test("reports a missing step without side effects", async () => {
      const { deleter, repository, api } = setup({ activeStep: null });

      await expect(deleter.deleteStep("step-1")).resolves.toBe("missing");

      expect(repository.removeStep).not.toHaveBeenCalled();
      expect(api.deleteStep).not.toHaveBeenCalled();
    });

    test("marks a synced step deleted before asking the server, then removes it", async () => {
      const { deleter, repository, api, stepState } = setup();

      await expect(deleter.deleteStep("step-1")).resolves.toBe("removed");

      expect(stepState.markStepDeleted).toHaveBeenCalledWith("step-1", NOW);
      expect(vi.mocked(stepState.markStepDeleted).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(api.deleteStep).mock.invocationCallOrder[0] ?? 0,
      );
      expect(api.deleteStep).toHaveBeenCalledWith("server-step-1");
      expect(repository.removeStep).toHaveBeenCalledWith("step-1");
    });

    test.each([404, 409])("treats a %s from the server as already deleted", async (status) => {
      const { deleter, repository, api } = setup();
      vi.mocked(api.deleteStep).mockRejectedValue(createApiError(status));

      await expect(deleter.deleteStep("step-1")).resolves.toBe("removed");

      expect(repository.removeStep).toHaveBeenCalledWith("step-1");
    });

    test("keeps the deleted row when the request fails transiently", async () => {
      const { deleter, repository, api, log } = setup();
      vi.mocked(api.deleteStep).mockRejectedValue(createApiError(500));

      await expect(deleter.deleteStep("step-1")).resolves.toBe("retrying");

      expect(repository.removeStep).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalled();
    });

    test.each([401, 403])(
      "keeps the deleted row when the user is signed out (%s)",
      async (status) => {
        const { deleter, repository, api } = setup();
        vi.mocked(api.deleteStep).mockRejectedValue(createApiError(status));

        await expect(deleter.deleteStep("step-1")).resolves.toBe("retrying");

        expect(repository.removeStep).not.toHaveBeenCalled();
      },
    );
  });

  describe("pushDeletion", () => {
    test("confirms a retried delete and removes the row", async () => {
      const { deleter, repository, api } = setup();

      await expect(deleter.pushDeletion(step())).resolves.toBe("removed");

      expect(api.deleteStep).toHaveBeenCalledWith("server-step-1");
      expect(repository.removeStep).toHaveBeenCalledWith("step-1");
    });

    test("removes a row whose server step is already gone", async () => {
      const { deleter, repository, api } = setup();
      vi.mocked(api.deleteStep).mockRejectedValue(createApiError(404));

      await expect(deleter.pushDeletion(step())).resolves.toBe("removed");

      expect(repository.removeStep).toHaveBeenCalledWith("step-1");
    });

    test("leaves a transient failure for the next drain", async () => {
      const { deleter, repository, api } = setup();
      vi.mocked(api.deleteStep).mockRejectedValue(new Error("offline"));

      await expect(deleter.pushDeletion(step())).resolves.toBe("retrying");

      expect(repository.removeStep).not.toHaveBeenCalled();
    });

    test("throws on an auth failure so the drainer pauses", async () => {
      const { deleter, repository, api } = setup();
      vi.mocked(api.deleteStep).mockRejectedValue(createApiError(401));

      await expect(deleter.pushDeletion(step())).rejects.toThrow("boom");
      expect(repository.removeStep).not.toHaveBeenCalled();
    });
  });

  describe("deleteGuide", () => {
    test("deletes the guide", async () => {
      const { deleter, api } = setup();

      await expect(deleter.deleteGuide("guide-1")).resolves.toBe("deleted");
      expect(api.deleteGuide).toHaveBeenCalledWith("guide-1");
    });

    test.each([404, 409])("treats a %s as an already deleted guide", async (status) => {
      const { deleter, api } = setup();
      vi.mocked(api.deleteGuide).mockRejectedValue(createApiError(status));

      await expect(deleter.deleteGuide("guide-1")).resolves.toBe("missing");
    });

    test("surfaces a transient failure so the caller can keep the session", async () => {
      const { deleter, api } = setup();
      vi.mocked(api.deleteGuide).mockRejectedValue(createApiError(500));

      await expect(deleter.deleteGuide("guide-1")).rejects.toThrow("boom");
    });
  });

  describe("countPendingDeletions", () => {
    test("delegates to the step-state repository with the user scope", async () => {
      const { deleter, countPendingDeletions } = setup();
      countPendingDeletions.mockResolvedValue(2);

      await expect(deleter.countPendingDeletions("user-1")).resolves.toBe(2);
      expect(countPendingDeletions).toHaveBeenCalledWith("user-1");
    });
  });
});
