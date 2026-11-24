import type { OutboxDrainer } from "./outbox-drainer.service";
import type { OutboxRepository } from "./outbox.repository";
import { emptyOutboxCounts, syncStatusValues, type LocalSession } from "@/models";
import { isDeveloperBuild } from "@/utils/diagnostics";

type OutboxDiagnosticsDeps = {
  repository: Pick<OutboxRepository, "getCounts"> & {
    listSessions: () => Promise<LocalSession[]>;
  };
  drainer: Pick<OutboxDrainer, "getState">;
  isDev?: boolean;
};

export const createOutboxDiagnostics = ({
  repository,
  drainer,
  isDev = isDeveloperBuild,
}: OutboxDiagnosticsDeps) => {
  const getState = async () => {
    if (!isDev) {
      return null;
    }

    const sessions = await repository.listSessions();
    const sessionCounts = await Promise.all(
      sessions.map((session) => repository.getCounts(session.id)),
    );
    const steps = sessionCounts.reduce(
      (totals, counts) => {
        for (const status of syncStatusValues) {
          totals[status] += counts[status];
        }
        return totals;
      },
      { ...emptyOutboxCounts },
    );

    return {
      sessions: sessions.length,
      steps,
      drainer: drainer.getState(),
    };
  };

  return { getState };
};

export type OutboxDiagnostics = ReturnType<typeof createOutboxDiagnostics>;
