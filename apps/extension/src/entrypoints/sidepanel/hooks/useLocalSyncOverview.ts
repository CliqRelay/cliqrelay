import { useLiveQuery } from "dexie-react-hooks";

import {
  emptyOutboxCounts,
  type LocalSyncOverview,
  type LocalSyncSessionSummary,
  type OutboxCounts,
} from "@/models";
import { outboxRepository } from "@/services/outbox";

const emptyOverview: LocalSyncOverview = {
  counts: emptyOutboxCounts,
  sessions: [],
  otherSessions: [],
};

const hasLocalData = (counts: OutboxCounts): boolean =>
  counts.pending + counts.uploading + counts.synced + counts.failed > 0;

const sumCounts = (summaries: LocalSyncSessionSummary[]): OutboxCounts =>
  summaries.reduce<OutboxCounts>(
    (total, summary) => ({
      pending: total.pending + summary.counts.pending,
      uploading: total.uploading + summary.counts.uploading,
      synced: total.synced + summary.counts.synced,
      failed: total.failed + summary.counts.failed,
      deleted: total.deleted + summary.counts.deleted,
    }),
    { ...emptyOutboxCounts },
  );

/**
 * Settings needs every session's local footprint, split by owner so another
 * account's captures are visible but never drained.
 */
export const loadLocalSyncOverview = async (
  userId: string | undefined,
): Promise<LocalSyncOverview> => {
  if (!userId) {
    return emptyOverview;
  }

  const sessions = await outboxRepository.listSessions();
  const ownSessions = sessions.filter((session) => session.userId === userId);
  const otherSessions = sessions.filter((session) => session.userId !== userId);

  const summaries = await Promise.all(
    ownSessions.map(async (session): Promise<LocalSyncSessionSummary> => {
      const [counts, steps] = await Promise.all([
        outboxRepository.getCounts(session.id),
        outboxRepository.listSteps(session.id),
      ]);

      return {
        session,
        counts,
        failedSteps: steps.filter((step) => step.syncStatus === "failed"),
      };
    }),
  );

  return {
    counts: sumCounts(summaries),
    sessions: summaries.filter((summary) => hasLocalData(summary.counts)),
    otherSessions,
  };
};

export type LocalSyncOverviewResult = {
  overview: LocalSyncOverview;
  isLoading: boolean;
};

export const useLocalSyncOverview = (userId: string | undefined): LocalSyncOverviewResult => {
  const overview = useLiveQuery(() => loadLocalSyncOverview(userId), [userId]);

  return {
    overview: overview ?? emptyOverview,
    isLoading: overview === undefined,
  };
};
