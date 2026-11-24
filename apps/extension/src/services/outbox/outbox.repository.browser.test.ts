import { Dexie } from "dexie";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createOutboxRepository } from "./outbox.repository";
import type { OutboxRepository } from "./outbox.repository";
import type {
  AppendNavigationStepInput,
  AppendStepInput,
  AppendStepWithBlobsInput,
  CaptureBlobsInput,
  CreateSessionInput,
} from "@/models";
import { outboxLifecycleSchema } from "@/models";
import { createDatabase } from "@/services/db";
import type { OutboxDatabase } from "@/services/db";

const NOW = "2026-11-23T12:00:00.000Z";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW_MS = Date.parse(NOW);

const hoursAgo = (hours: number) => new Date(NOW_MS - hours * HOUR_MS).toISOString();
const daysAgo = (days: number) => new Date(NOW_MS - days * DAY_MS).toISOString();

let databaseCounter = 0;
let databaseName: string;
let db: OutboxDatabase;
let repository: OutboxRepository;

const createSession = (overrides: Partial<CreateSessionInput> = {}) =>
  repository.createSession({
    userId: "user-1",
    guideId: "guide-1",
    startedAt: NOW,
    ...overrides,
  });

const appendStep = (
  sessionId: string,
  overrides: Partial<Omit<AppendStepInput, "sessionId">> = {},
) =>
  repository.appendStep({
    sessionId,
    kind: "interaction",
    action: "click",
    url: "https://example.com/page",
    capturedAt: NOW,
    now: NOW,
    ...overrides,
  });

const webpBlob = (seed = 1) =>
  new Blob([new Uint8Array([seed, seed + 1, seed + 2])], { type: "image/webp" });

const appendStepWithBlobs = (
  sessionId: string,
  overrides: Partial<Omit<AppendStepWithBlobsInput, "sessionId">> = {},
  blobs: CaptureBlobsInput = { screenshot: webpBlob(11), thumbnail: webpBlob(21) },
) =>
  repository.appendStepWithBlobs(
    {
      sessionId,
      kind: "interaction",
      action: "click",
      url: "https://example.com/page",
      capturedAt: NOW,
      now: NOW,
      ...overrides,
    },
    blobs,
  );

beforeEach(() => {
  databaseName = `cliqrelay-test-${Date.now()}-${databaseCounter++}`;
  db = createDatabase(databaseName);
  repository = createOutboxRepository(db);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(databaseName);
});

describe("outbox database", () => {
  test("should define the sessions, steps and blobs stores", () => {
    expect(db.tables.map((table) => table.name).sort()).toEqual(["blobs", "sessions", "steps"]);
  });

  test("should define the outbox indexes", () => {
    const secondaryIndexes = (tableName: string) =>
      db
        .table(tableName)
        .schema.indexes.map((index) => index.name)
        .sort();

    expect(secondaryIndexes("sessions")).toEqual(["guideId", "startedAt", "userId"]);
    expect(secondaryIndexes("steps")).toEqual([
      "[guideId+syncStatus]",
      "[sessionId+stepIndex]",
      "[sessionId+syncStatus]",
      "[sessionId+typingSessionId]",
      "guideId",
      "sessionId",
      "syncStatus",
    ]);
    expect(secondaryIndexes("blobs")).toEqual(["[stepId+kind]", "stepId"]);
    expect(db.table("steps").schema.primKey.name).toBe("id");
  });
});

describe("session records", () => {
  test("should create, read and update a session", async () => {
    const session = await createSession({ id: "session-1" });

    expect(session).toMatchObject({
      id: "session-1",
      userId: "user-1",
      guideId: "guide-1",
      clientGuideId: "session-1",
      startedAt: NOW,
      lastActivityAt: NOW,
      nextStepIndex: 0,
    });
    expect(session.stoppedAt).toBeUndefined();

    await repository.updateSession("session-1", {
      guideId: "guide-2",
      stoppedAt: NOW,
    });

    const updated = await repository.getSession("session-1");
    expect(updated?.guideId).toBe("guide-2");
    expect(updated?.stoppedAt).toBe(NOW);
  });

  test("should list sessions per user, newest first", async () => {
    await createSession({ id: "old", userId: "user-1", startedAt: hoursAgo(2) });
    await createSession({ id: "new", userId: "user-1", startedAt: NOW });
    await createSession({ id: "other", userId: "user-2", startedAt: hoursAgo(3) });

    expect((await repository.listSessions()).map((session) => session.id)).toEqual([
      "new",
      "old",
      "other",
    ]);
    expect((await repository.listSessionsByUserId("user-1")).map((session) => session.id)).toEqual([
      "new",
      "old",
    ]);
  });
});

describe("appendStep", () => {
  test("should allocate sequential indexes for concurrent callers", async () => {
    const session = await createSession();

    const steps = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        appendStep(session.id, { action: `click-${index}` }),
      ),
    );

    const indexes = steps.map((step) => step.stepIndex).sort((a, b) => a - b);
    expect(indexes).toEqual(Array.from({ length: 12 }, (_, index) => index));
    expect(new Set(indexes).size).toBe(indexes.length);

    const stored = await repository.getSession(session.id);
    expect(stored?.nextStepIndex).toBe(12);
    expect(stored?.lastActivityAt).toBe(NOW);
    expect(await db.steps.where("sessionId").equals(session.id).count()).toBe(12);
  });

  test("should return steps ordered by step index", async () => {
    const session = await createSession();

    await appendStep(session.id, { action: "first" });
    await appendStep(session.id, { action: "second" });
    await appendStep(session.id, { action: "third" });

    const steps = await repository.listSteps(session.id);
    expect(steps.map((step) => [step.stepIndex, step.action])).toEqual([
      [0, "first"],
      [1, "second"],
      [2, "third"],
    ]);
  });

  test("should default status and copy the session guide id", async () => {
    const session = await createSession({ guideId: "guide-9" });

    const step = await appendStep(session.id);

    expect(step.syncStatus).toBe("pending");
    expect(step.retryCount).toBe(0);
    expect(step.guideId).toBe("guide-9");
    expect(step.createdAt).toBe(NOW);
    expect(step.updatedAt).toBe(NOW);
  });

  test("should reject an unknown session", async () => {
    await expect(appendStep("missing-session")).rejects.toThrow(
      "Outbox session not found: missing-session",
    );
  });
});

describe("appendStepWithBlobs", () => {
  test("should write the step and both blobs atomically", async () => {
    const session = await createSession({ guideId: "guide-7" });
    const screenshot = webpBlob(10);
    const thumbnail = webpBlob(20);

    const step = await appendStepWithBlobs(session.id, {}, { screenshot, thumbnail });

    expect(step).toMatchObject({
      sessionId: session.id,
      guideId: "guide-7",
      stepIndex: 0,
      syncStatus: "pending",
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(step.screenshotBlobId).toBeDefined();
    expect(step.thumbnailBlobId).toBeDefined();
    expect(step.screenshotBlobId).not.toBe(step.thumbnailBlobId);

    const storedScreenshot = await repository.getBlobByStepAndKind(step.id, "screenshot");
    expect(storedScreenshot).toMatchObject({
      id: step.screenshotBlobId,
      stepId: step.id,
      kind: "screenshot",
      createdAt: NOW,
    });
    expect(storedScreenshot?.blob.size).toBe(screenshot.size);
    expect(storedScreenshot?.blob.type).toBe("image/webp");

    const storedThumbnail = await repository.getBlobByStepAndKind(step.id, "thumbnail");
    expect(storedThumbnail).toMatchObject({
      id: step.thumbnailBlobId,
      stepId: step.id,
      kind: "thumbnail",
      createdAt: NOW,
    });
    expect(storedThumbnail?.blob.size).toBe(thumbnail.size);

    expect(await db.blobs.where("stepId").equals(step.id).count()).toBe(2);
    expect((await repository.getSession(session.id))?.nextStepIndex).toBe(1);
    expect((await repository.getSession(session.id))?.lastActivityAt).toBe(NOW);
  });

  test("should roll back the step, index and blobs when the blob insert fails", async () => {
    const session = await createSession({ guideId: "guide-7" });
    const unclonable = { capture: () => undefined } as unknown as Blob;

    await expect(
      appendStepWithBlobs(
        session.id,
        { action: "rollback" },
        {
          screenshot: unclonable,
          thumbnail: webpBlob(21),
        },
      ),
    ).rejects.toBeInstanceOf(Error);

    expect(await db.steps.where("sessionId").equals(session.id).count()).toBe(0);
    expect(await db.blobs.count()).toBe(0);

    const stored = await repository.getSession(session.id);
    expect(stored?.nextStepIndex).toBe(0);
    expect(stored?.lastActivityAt).toBe(NOW);
  });
});

describe("navigation steps", () => {
  test("should store a navigation step from AppendNavigationStepInput", async () => {
    const session = await createSession({ guideId: "guide-nav" });
    const input: AppendNavigationStepInput = {
      sessionId: session.id,
      url: "https://example.com/start",
      capturedAt: NOW,
      now: NOW,
    };

    const step = await repository.appendStep({
      ...input,
      kind: "navigation",
      action: "navigation",
    });

    expect(step).toMatchObject({
      sessionId: session.id,
      guideId: "guide-nav",
      stepIndex: 0,
      kind: "navigation",
      action: "navigation",
      url: "https://example.com/start",
      capturedAt: NOW,
    });
  });
});

describe("getLastStep", () => {
  test("should return the step with the highest index", async () => {
    const session = await createSession();
    expect(await repository.getLastStep(session.id)).toBeUndefined();

    await appendStep(session.id, { action: "first" });
    const last = await appendStep(session.id, { action: "last" });

    expect((await repository.getLastStep(session.id))?.id).toBe(last.id);

    const other = await createSession({ id: "other" });
    expect(await repository.getLastStep(other.id)).toBeUndefined();
    await appendStep(other.id, { action: "other" });
    expect((await repository.getLastStep(other.id))?.action).toBe("other");
  });

  test("should ignore gaps left by deleted steps", async () => {
    const session = await createSession();
    const first = await appendStep(session.id, { action: "first" });
    await appendStep(session.id, { action: "second" });
    const third = await appendStep(session.id, { action: "third" });

    await repository.removeStep(first.id);

    expect((await repository.getLastStep(session.id))?.id).toBe(third.id);
  });
});

describe("setSessionGuideId", () => {
  test("should set, replace and clear the session guide id", async () => {
    await createSession({ id: "session-1", guideId: null });

    expect((await repository.setSessionGuideId("session-1", "guide-42"))?.guideId).toBe("guide-42");
    expect((await repository.getSession("session-1"))?.guideId).toBe("guide-42");
    expect((await repository.setSessionGuideId("session-1", null))?.guideId).toBeNull();
    expect(await repository.setSessionGuideId("missing", "guide-42")).toBeUndefined();
  });
});

describe("deleteSessionData", () => {
  test("should delete the session with all of its steps and blobs", async () => {
    const mine = await createSession({ id: "mine", userId: "user-1" });
    const theirs = await createSession({ id: "theirs", userId: "user-2" });
    const myBlobStep = await appendStepWithBlobs(mine.id);
    const myPlainStep = await appendStep(mine.id);
    const theirStep = await appendStepWithBlobs(theirs.id);

    expect(await repository.deleteSessionData(mine.id)).toEqual({
      sessions: 1,
      steps: 2,
      blobs: 2,
    });

    expect(await db.sessions.get(mine.id)).toBeUndefined();
    expect(await db.steps.get(myBlobStep.id)).toBeUndefined();
    expect(await db.steps.get(myPlainStep.id)).toBeUndefined();
    expect(await db.blobs.where("stepId").equals(myBlobStep.id).count()).toBe(0);

    expect(await db.sessions.get(theirs.id)).toBeDefined();
    expect(await db.steps.where("sessionId").equals(theirs.id).count()).toBe(1);
    expect(await db.blobs.where("stepId").equals(theirStep.id).count()).toBe(2);

    expect(await repository.deleteSessionData(mine.id)).toEqual({
      sessions: 0,
      steps: 0,
      blobs: 0,
    });
  });
});

describe("upsertTypingStep", () => {
  const upsert = (sessionId: string, typingSessionId: string, actionText: string) =>
    repository.upsertTypingStep({
      sessionId,
      typingSessionId,
      kind: "interaction",
      action: "type",
      actionText,
      url: "https://example.com/form",
      capturedAt: NOW,
      now: NOW,
    });

  test("should insert once and update the existing typing step", async () => {
    const session = await createSession();

    const first = await upsert(session.id, "typing-1", "h");
    const second = await upsert(session.id, "typing-1", "hello");

    expect(second.id).toBe(first.id);
    expect(second.stepIndex).toBe(0);
    expect(second.actionText).toBe("hello");

    const steps = await repository.listSteps(session.id);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.actionText).toBe("hello");
    expect((await repository.getSession(session.id))?.nextStepIndex).toBe(1);
  });

  test("should allocate a new index for a new typing session", async () => {
    const session = await createSession();

    await upsert(session.id, "typing-1", "first");
    await upsert(session.id, "typing-1", "first!");
    await upsert(session.id, "typing-2", "second");

    const steps = await repository.listSteps(session.id);
    expect(steps.map((step) => step.stepIndex)).toEqual([0, 1]);
    expect((await repository.getSession(session.id))?.nextStepIndex).toBe(2);
  });
});

describe("typing step lookup and deletion", () => {
  test("should list and find only the typing steps of a session", async () => {
    const session = await createSession();
    await appendStepWithBlobs(session.id, { action: "click" });
    const first = await appendStepWithBlobs(session.id, {
      action: "type",
      actionText: "a",
      typingSessionId: "typing-1",
    });
    const second = await appendStepWithBlobs(session.id, {
      action: "type",
      actionText: "ab",
      typingSessionId: "typing-2",
    });
    await createSession({ id: "other" });

    const typing = await repository.listTypingSteps(session.id);
    expect(typing.map((step) => step.id)).toEqual([first.id, second.id]);
    expect((await repository.findTypingStep(session.id, "typing-1"))?.id).toBe(first.id);
    expect(await repository.findTypingStep(session.id, "typing-3")).toBeUndefined();
    expect(await repository.findTypingStep("other", "typing-1")).toBeUndefined();
    expect(await repository.listTypingSteps("other")).toEqual([]);
  });

  test("should hard delete the typing step and its blobs", async () => {
    const session = await createSession();
    const typing = await appendStepWithBlobs(session.id, {
      action: "type",
      typingSessionId: "typing-1",
    });
    const other = await appendStepWithBlobs(session.id, {
      action: "type",
      typingSessionId: "typing-2",
    });

    expect(await repository.deleteTypingStep(session.id, "typing-1")).toBe(true);

    expect(await db.steps.get(typing.id)).toBeUndefined();
    expect(await db.blobs.where("stepId").equals(typing.id).count()).toBe(0);
    expect(await db.steps.get(other.id)).toBeDefined();
    expect(await db.blobs.where("stepId").equals(other.id).count()).toBe(2);

    expect(await repository.deleteTypingStep(session.id, "typing-1")).toBe(false);
  });
});

describe("counts and syncable steps", () => {
  test("should count every sync status", async () => {
    const session = await createSession();
    const pendingA = await appendStep(session.id);
    const uploading = await appendStep(session.id);
    const synced = await appendStep(session.id);
    const failed = await appendStep(session.id);
    const toDelete = await appendStep(session.id);
    const pendingB = await appendStep(session.id);

    await repository.markStepUploading(uploading.id, NOW);
    await repository.markStepSynced(synced.id, { serverStepId: "server-1", now: NOW });
    await repository.markStepFailed(failed.id, "network", NOW);
    await repository.markStepSynced(toDelete.id, { serverStepId: "server-2", now: NOW });
    await repository.markStepDeleted(toDelete.id, NOW);

    expect(await repository.getCounts(session.id)).toEqual({
      pending: 2,
      uploading: 1,
      synced: 1,
      failed: 1,
      deleted: 1,
    });
    expect(pendingB.stepIndex).toBe(pendingA.stepIndex + 5);
  });

  test("should list pending, uploading and failed steps for a session in order", async () => {
    const session = await createSession();
    const first = await appendStep(session.id, { action: "pending" });
    const second = await appendStep(session.id, { action: "uploading" });
    const third = await appendStep(session.id, { action: "failed" });
    const fourth = await appendStep(session.id, { action: "synced" });

    await repository.markStepUploading(second.id, NOW);
    await repository.markStepFailed(third.id, "boom", NOW);
    await repository.markStepSynced(fourth.id, { now: NOW });

    const syncable = await repository.listSyncableSteps({ sessionId: session.id });
    expect(syncable.map((step) => [step.action, step.stepIndex])).toEqual([
      ["pending", first.stepIndex],
      ["uploading", second.stepIndex],
      ["failed", third.stepIndex],
    ]);
  });

  test("should scope syncable steps to a user and exclude other accounts", async () => {
    const session = await createSession({ id: "mine", userId: "user-1" });
    const other = await createSession({ id: "theirs", userId: "user-2" });
    await appendStep(session.id, { action: "mine-1" });
    await appendStep(session.id, { action: "mine-2" });
    await appendStep(other.id, { action: "theirs-1" });

    const syncable = await repository.listSyncableSteps({ userId: "user-1" });
    expect(syncable.map((step) => step.action)).toEqual(["mine-1", "mine-2"]);

    expect(await repository.listSyncableSteps({ userId: "user-3" })).toEqual([]);
    expect(await repository.listSyncableSteps({})).toEqual([]);
  });
});

describe("blobs", () => {
  test("should store and read blobs by id and by step/kind", async () => {
    const session = await createSession();
    const step = await appendStep(session.id);
    const screenshot = await repository.putBlob({
      stepId: step.id,
      kind: "screenshot",
      blob: webpBlob(1),
      createdAt: NOW,
    });
    await repository.putBlob({
      stepId: step.id,
      kind: "thumbnail",
      blob: webpBlob(2),
      createdAt: NOW,
    });

    expect((await repository.getBlob(screenshot.id))?.kind).toBe("screenshot");
    expect(await repository.getBlobByStepAndKind(step.id, "thumbnail")).toMatchObject({
      stepId: step.id,
      kind: "thumbnail",
    });
    expect((await repository.getBlobByStepAndKind(step.id, "screenshot"))?.blob.size).toBe(3);

    await repository.deleteBlob(screenshot.id);
    expect(await repository.getBlob(screenshot.id)).toBeUndefined();
    expect(await db.blobs.where("stepId").equals(step.id).count()).toBe(1);
  });

  test("should prune the full screenshot and keep the thumbnail when synced", async () => {
    const session = await createSession();
    const step = await appendStep(session.id);
    await repository.putBlob({
      stepId: step.id,
      kind: "screenshot",
      blob: webpBlob(1),
      createdAt: NOW,
    });
    await repository.putBlob({
      stepId: step.id,
      kind: "thumbnail",
      blob: webpBlob(2),
      createdAt: NOW,
    });

    await repository.markStepSynced(step.id, {
      serverStepId: "server-step-1",
      serverScreenshotUrl: "https://cdn.example.com/step.webp",
      now: NOW,
    });

    const stored = await db.steps.get(step.id);
    expect(stored).toMatchObject({
      syncStatus: "synced",
      serverStepId: "server-step-1",
      serverScreenshotUrl: "https://cdn.example.com/step.webp",
      updatedAt: NOW,
    });
    expect(await repository.getBlobByStepAndKind(step.id, "screenshot")).toBeUndefined();
    expect((await repository.getBlobByStepAndKind(step.id, "thumbnail"))?.blob.size).toBe(3);
  });
});

describe("sync bookkeeping", () => {
  test("should reset stale uploading steps to pending", async () => {
    const session = await createSession();
    const first = await appendStep(session.id);
    const second = await appendStep(session.id);
    const third = await appendStep(session.id);

    await repository.markStepUploading(first.id, NOW);
    await repository.markStepUploading(second.id, NOW);

    expect(await repository.resetStaleUploading(NOW)).toBe(2);

    const steps = await repository.listSteps(session.id);
    expect(steps.map((step) => step.syncStatus)).toEqual(["pending", "pending", "pending"]);
    expect(steps[0]?.lastAttemptAt).toBe(NOW);
    expect((await repository.getSession(session.id))?.nextStepIndex).toBe(third.stepIndex + 1);
  });

  test("should increment retry count and keep the last error", async () => {
    const session = await createSession();
    const step = await appendStep(session.id);
    const firstAttempt = hoursAgo(1);

    await repository.markStepFailed(step.id, "network down", firstAttempt);
    await repository.markStepFailed(step.id, "still down", NOW);

    const stored = await db.steps.get(step.id);
    expect(stored).toMatchObject({
      syncStatus: "failed",
      retryCount: 2,
      lastError: "still down",
      lastAttemptAt: NOW,
      updatedAt: NOW,
    });
  });
});

describe("deletion", () => {
  test("should hard delete an unsynced step and its blobs", async () => {
    const session = await createSession();
    const step = await appendStep(session.id);
    await repository.putBlob({
      stepId: step.id,
      kind: "screenshot",
      blob: webpBlob(1),
    });

    expect(await repository.markStepDeleted(step.id, NOW)).toBe("removed");

    expect(await db.steps.get(step.id)).toBeUndefined();
    expect(await db.blobs.where("stepId").equals(step.id).count()).toBe(0);
  });

  test("should tombstone a synced step until the server delete succeeds", async () => {
    const session = await createSession();
    const step = await appendStep(session.id);
    await repository.putBlob({
      stepId: step.id,
      kind: "thumbnail",
      blob: webpBlob(1),
    });
    await repository.markStepSynced(step.id, { serverStepId: "server-1", now: NOW });

    expect(await repository.markStepDeleted(step.id, NOW)).toBe("marked");
    expect((await db.steps.get(step.id))?.syncStatus).toBe("deleted");
    expect(await db.blobs.where("stepId").equals(step.id).count()).toBe(1);

    await repository.removeStep(step.id);

    expect(await db.steps.get(step.id)).toBeUndefined();
    expect(await db.blobs.where("stepId").equals(step.id).count()).toBe(0);
  });

  test("should treat an already tombstoned step as marked", async () => {
    const session = await createSession();
    const step = await appendStep(session.id);
    await repository.markStepSynced(step.id, { now: NOW });
    await repository.markStepDeleted(step.id, NOW);

    expect(await repository.markStepDeleted(step.id, NOW)).toBe("marked");
    expect((await db.steps.get(step.id))?.syncStatus).toBe("deleted");
  });
});

describe("prune", () => {
  test("should apply the retention rules against the injected clock", async () => {
    const stoppedSynced = await createSession({
      id: "stopped-synced",
      startedAt: hoursAgo(30),
      guideId: "guide-a",
    });
    await repository.updateSession(stoppedSynced.id, { stoppedAt: hoursAgo(25) });
    const syncedStep = await appendStep(stoppedSynced.id);
    await repository.putBlob({
      stepId: syncedStep.id,
      kind: "thumbnail",
      blob: webpBlob(1),
    });
    await repository.markStepSynced(syncedStep.id, { now: hoursAgo(25) });

    const recentSynced = await createSession({
      id: "recent-synced",
      startedAt: hoursAgo(3),
    });
    await repository.updateSession(recentSynced.id, { stoppedAt: hoursAgo(1) });
    const recentStep = await appendStep(recentSynced.id);
    await repository.markStepSynced(recentStep.id, { now: hoursAgo(1) });

    const withFailed = await createSession({
      id: "with-failed",
      startedAt: daysAgo(10),
    });
    await repository.updateSession(withFailed.id, { lastActivityAt: hoursAgo(1) });
    const failedStep = await appendStep(withFailed.id, { capturedAt: daysAgo(9) });
    await repository.putBlob({
      stepId: failedStep.id,
      kind: "screenshot",
      blob: webpBlob(2),
    });
    await repository.markStepFailed(failedStep.id, "upload failed", daysAgo(8));
    const keptSyncedStep = await appendStep(withFailed.id);
    await repository.markStepSynced(keptSyncedStep.id, { now: daysAgo(9) });

    const inactiveUnsynced = await createSession({
      id: "inactive-unsynced",
      startedAt: daysAgo(10),
    });
    const pendingStep = await appendStep(inactiveUnsynced.id, {
      capturedAt: daysAgo(8),
    });
    await repository.putBlob({
      stepId: pendingStep.id,
      kind: "screenshot",
      blob: webpBlob(3),
    });
    await repository.updateSession(inactiveUnsynced.id, {
      lastActivityAt: daysAgo(8),
    });

    const activePending = await createSession({
      id: "active-pending",
      startedAt: daysAgo(10),
    });
    await appendStep(activePending.id, { capturedAt: hoursAgo(1) });

    const result = await repository.prune(NOW);

    expect(result).toEqual({ sessions: 2, steps: 3, blobs: 3 });
    expect((await repository.listSessions()).map((session) => session.id).sort()).toEqual([
      "active-pending",
      "recent-synced",
      "with-failed",
    ]);
    expect(await db.steps.where("sessionId").equals(stoppedSynced.id).count()).toBe(0);
    expect(await db.steps.where("sessionId").equals(inactiveUnsynced.id).count()).toBe(0);
    expect(await db.steps.get(failedStep.id)).toBeUndefined();
    expect(await db.blobs.where("stepId").equals(failedStep.id).count()).toBe(0);
    expect(await db.steps.get(recentStep.id)).toBeDefined();
    expect(await db.steps.get(keptSyncedStep.id)).toBeDefined();
    expect(await db.steps.where("sessionId").equals(activePending.id).count()).toBe(1);
  });

  test("should keep data that is not due for retention", async () => {
    const session = await createSession();
    await repository.updateSession(session.id, { lastActivityAt: hoursAgo(1) });
    const step = await appendStep(session.id);

    expect(await repository.prune(NOW)).toEqual({
      sessions: 0,
      steps: 0,
      blobs: 0,
    });
    expect(await db.steps.get(step.id)).toBeDefined();
    expect(await db.sessions.get(session.id)).toBeDefined();
  });
});

describe("discardForUser", () => {
  test("should remove only the requested user's local data", async () => {
    const mine = await createSession({ id: "mine", userId: "user-1" });
    const theirs = await createSession({ id: "theirs", userId: "user-2" });
    const myStep = await appendStep(mine.id);
    const theirStep = await appendStep(theirs.id);

    await repository.putBlob({
      stepId: myStep.id,
      kind: "screenshot",
      blob: webpBlob(1),
    });
    await repository.putBlob({
      stepId: theirStep.id,
      kind: "screenshot",
      blob: webpBlob(2),
    });

    expect(await repository.discardForUser("user-1")).toEqual({
      sessions: 1,
      steps: 1,
      blobs: 1,
    });

    expect(await db.sessions.get(mine.id)).toBeUndefined();
    expect(await db.steps.get(myStep.id)).toBeUndefined();
    expect(await db.blobs.where("stepId").equals(myStep.id).count()).toBe(0);

    expect(await db.sessions.get(theirs.id)).toBeDefined();
    expect(await db.steps.get(theirStep.id)).toBeDefined();
    expect(await db.blobs.where("stepId").equals(theirStep.id).count()).toBe(1);
  });

  test("should be a no-op for a user without local data", async () => {
    await createSession({ userId: "user-1" });

    expect(await repository.discardForUser("user-2")).toEqual({
      sessions: 0,
      steps: 0,
      blobs: 0,
    });
  });
});

describe("outbox lifecycle schema", () => {
  test("should round-trip a recording lifecycle with a pending start", () => {
    const lifecycle = {
      status: "recording" as const,
      sessionId: "session-1",
      isSignedOut: false,
      pendingStart: { clientGuideId: "client-guide-1", startedAt: NOW },
    };

    expect(outboxLifecycleSchema.parse(lifecycle)).toEqual(lifecycle);
  });

  test("should round-trip a minimal signed-out lifecycle", () => {
    const lifecycle = { status: "idle" as const, isSignedOut: true };

    expect(outboxLifecycleSchema.parse(lifecycle)).toEqual(lifecycle);
  });

  test.each(["idle", "recording", "paused", "stopped"])("should accept the %s status", (status) => {
    expect(outboxLifecycleSchema.safeParse({ status, isSignedOut: false }).success).toBe(true);
  });

  test("should reject a lifecycle without isSignedOut", () => {
    expect(outboxLifecycleSchema.safeParse({ status: "idle" }).success).toBe(false);
  });

  test("should reject an unknown status", () => {
    expect(outboxLifecycleSchema.safeParse({ status: "syncing", isSignedOut: false }).success).toBe(
      false,
    );
  });

  test("should reject a pending start without startedAt", () => {
    const result = outboxLifecycleSchema.safeParse({
      status: "recording",
      isSignedOut: false,
      pendingStart: { clientGuideId: "client-guide-1" },
    });

    expect(result.success).toBe(false);
  });
});
