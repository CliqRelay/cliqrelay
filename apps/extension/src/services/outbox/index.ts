import { createOutboxRepository } from "./outbox.repository";
import { db } from "@/services/db";

export { createDatabase, db, OUTBOX_DATABASE_NAME } from "@/services/db";
export type { OutboxDatabase } from "@/services/db";
export { createOutboxRepository } from "./outbox.repository";
export type { OutboxRepository } from "./outbox.repository";

export const outboxRepository = createOutboxRepository(db);
