import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createOutboxStepStateRepository } from "./outbox-step-state.repository";
import { createOutboxRepository } from "./outbox.repository";
import type { OutboxRepository } from "./outbox.repository";
import { createDatabase } from "@/services/db";
import type { OutboxDatabase } from "@/services/db";

const NOW = "2026-11-24T12:00:00.000Z";

let databaseCounter = 0;
let db: OutboxDatabase;
let repository: OutboxRepository;
let stepState: ReturnType<typeof createOutboxStepStateRepository>;

const createSessionWithSteps = async (userId: string, failedSteps: number) => {
  const session = await repository.createSession({
    userId,
    guideId: `guide-${userId}`,
    startedAt: NOW,
  });

  const steps = [];
  for (let index = 0; index < failedSteps; index++) {
    steps.push(
      await repository.appendStep({
        sessionId: session.id,
        kind: "interaction",
        action: "click",
        url: "https://example.com",
        capturedAt: NOW,
        now: NOW,
      }),
    );
  }

  return { session, steps };
};

beforeEach(() => {
  databaseCounter += 1;
  db = createDatabase(`cliqrelay-step-state-test-${databaseCounter}`);
  repository = createOutboxRepository(db);
  stepState = createOutboxStepStateRepository(db);
});

afterEach(async () => {
  await db.delete();
});

describe("outbox step state repository", () => {
  describe("server ids", () => {
    test("persists the server step id without touching the sync status", async () => {
      const { steps } = await createSessionWithSteps("user-1", 1);
      const step = steps[0]!;

      await stepState.setServerStepId(step.id, "server-step-1", NOW);

      const stored = await db.steps.get(step.id);
      expect(stored?.serverStepId).toBe("server-step-1");
      expect(stored?.syncStatus).toBe("pending");
    });

    test("persists the server screenshot url", async () => {
      const { steps } = await createSessionWithSteps("user-1", 1);
      const step = steps[0]!;

      await stepState.setServerScreenshotUrl(step.id, "https://cdn.test/one.webp", NOW);

      expect((await db.steps.get(step.id))?.serverScreenshotUrl).toBe("https://cdn.test/one.webp");
    });
  });

  describe("retryFailedSteps", () => {
    test("resets only the failed steps of one session", async () => {
      const first = await createSessionWithSteps("user-1", 2);
      const second = await createSessionWithSteps("user-1", 1);

      for (const step of [...first.steps, ...second.steps]) {
        await repository.markStepFailed(step.id, "network down", NOW);
      }

      await expect(stepState.retryFailedSteps({ sessionId: first.session.id }, NOW)).resolves.toBe(
        2,
      );

      const firstSteps = await repository.listSteps(first.session.id);
      const secondSteps = await repository.listSteps(second.session.id);
      expect(firstSteps.map((step) => step.syncStatus)).toEqual(["pending", "pending"]);
      expect(firstSteps[0]?.lastError).toBeUndefined();
      expect(secondSteps.map((step) => step.syncStatus)).toEqual(["failed"]);
    });

    test("resets every failed step owned by a user", async () => {
      const mine = await createSessionWithSteps("user-1", 2);
      const other = await createSessionWithSteps("user-2", 1);

      for (const step of [...mine.steps, ...other.steps]) {
        await repository.markStepFailed(step.id, "network down", NOW);
      }

      await expect(stepState.retryFailedSteps({ userId: "user-1" }, NOW)).resolves.toBe(2);

      expect((await repository.listSteps(other.session.id))[0]?.syncStatus).toBe("failed");
    });

    test("returns zero when the user owns nothing", async () => {
      await expect(stepState.retryFailedSteps({ userId: "nobody" }, NOW)).resolves.toBe(0);
    });
  });

  describe("countFailedSteps", () => {
    test("counts all failed steps or only one user's", async () => {
      const mine = await createSessionWithSteps("user-1", 1);
      const other = await createSessionWithSteps("user-2", 1);
      await repository.markStepFailed(mine.steps[0]!.id, "boom", NOW);
      await repository.markStepFailed(other.steps[0]!.id, "boom", NOW);

      await expect(stepState.countFailedSteps()).resolves.toBe(2);
      await expect(stepState.countFailedSteps("user-1")).resolves.toBe(1);
      await expect(stepState.countFailedSteps("nobody")).resolves.toBe(0);
    });
  });
});
