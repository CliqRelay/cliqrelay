import { useLiveQuery } from "dexie-react-hooks";

import { type OutboxCounts, emptyOutboxCounts } from "@/models";
import { outboxRepository } from "@/services/outbox";

export const useSyncCounts = (sessionId: string | undefined): OutboxCounts => {
  const counts = useLiveQuery(
    () => (sessionId ? outboxRepository.getCounts(sessionId) : emptyOutboxCounts),
    [sessionId],
  );

  return counts ?? emptyOutboxCounts;
};
