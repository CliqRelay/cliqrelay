import Dexie, { type EntityTable } from "dexie";

import type { LocalBlob, LocalSession, LocalStep } from "@/models";

export type OutboxDatabase = Dexie & {
  sessions: EntityTable<LocalSession, "id">;
  steps: EntityTable<LocalStep, "id">;
  blobs: EntityTable<LocalBlob, "id">;
};

export const OUTBOX_DATABASE_NAME = "cliqrelay";

export const createDatabase = (name: string = OUTBOX_DATABASE_NAME): OutboxDatabase => {
  const database = new Dexie(name) as OutboxDatabase;

  database.version(1).stores({
    sessions: "id, userId, guideId, startedAt",
    steps:
      "id, sessionId, guideId, syncStatus, [sessionId+stepIndex], [sessionId+syncStatus], [guideId+syncStatus], [sessionId+typingSessionId]",
    blobs: "id, stepId, [stepId+kind]",
  });

  return database;
};

export const db = createDatabase();
