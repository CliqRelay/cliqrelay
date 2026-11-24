import type { OutboxDrainer } from "./outbox-drainer.service";
import type { OutboxRepository } from "./outbox.repository";
import { emptyOutboxCounts, type OutboxCounts } from "@/models";

export type OutboxDiagnosticState = {
  sessions: number;
  steps: OutboxCounts;
  drainer: {
    isPaused: boolean;
    isRunning: boolean;
    queued: number;
    active: number;
    lastError: string | null;
  };
};

type OutboxDiagnosticsDeps = {
  repository: Pick<OutboxRepository, "listSessions" | "getCounts">;
  drainer: Pick<OutboxDrainer, "getState">;
};

/** Dev-only snapshot behind the `get_outbox_state` runtime message. */
export const createOutboxDiagnostics = ({ repository, drainer }: OutboxDiagnosticsDeps) => {
  const getState = async (): Promise<OutboxDiagnosticState> => {
    const sessions = await repository.listSessions();
    const steps = { ...emptyOutboxCounts };

    for (const session of sessions) {
      const counts = await repository.getCounts(session.id);
      for (const status of Object.keys(steps) as (keyof OutboxCounts)[]) {
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
