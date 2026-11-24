import { useLiveQuery } from "dexie-react-hooks";

import type { LocalSession } from "@/models";
import { outboxRepository } from "@/services/outbox";

export const useLiveSession = (sessionId: string | undefined): LocalSession | undefined =>
  useLiveQuery(() => (sessionId ? outboxRepository.getSession(sessionId) : undefined), [sessionId]);
