import type { OutboxDrainer } from "./outbox-drainer.service";
import type { OutboxRepository } from "./outbox.repository";
import { emptyOutboxCounts, syncStatusValues } from "@/models";
import { isDeveloperBuild } from "@/utils/diagnostics";

type OutboxDiagnosticsDeps = {
  repository: Pick<OutboxRepository, "listSessions" | "getCounts">;
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
    const steps = { ...emptyOutboxCounts };

    for (const session of sessions) {
      const counts = await repository.getCounts(session.id);
      for (const status of syncStatusValues) {
        steps[status] += counts[status];
      }
    }

    return {
      sessions: sessions.length,
      steps,
      drainer: drainer.getState(),
    };
  };

  return { getState };
};

export type OutboxDiagnostics = ReturnType<typeof createOutboxDiagnostics>;
