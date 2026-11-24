import type { LocalSession, RecordingLifecycleStore } from "@/models";
import type { OutboxRepository } from "@/services/outbox/outbox.repository";
import { RECORDING_PENDING_START_TTL_MS } from "@/utils/constants";

type PendingStart = { clientGuideId: string; startedAt: string };

type RecordingSessionRepository = Pick<
  OutboxRepository,
  | "createSession"
  | "getSession"
  | "updateSession"
  | "listSessions"
  | "listSteps"
  | "setSessionGuideId"
>;

type RecordingSessionDeps = {
  lifecycleStore: RecordingLifecycleStore;
  repository: RecordingSessionRepository;
  resolveUserId: () => Promise<string>;
  createGuide: (input: { clientGuideId: string; startedAt: string }) => Promise<{ id: string }>;
  deleteGuide: (guideId: string) => Promise<void>;
  now?: () => Date;
  pendingStartTtlMs?: number;
};

const parseTimestamp = (value: string): number | null => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

/**
 * Guide creation happens at start because a guide id is required before the
 * first local step can be linked to it. `pendingStart` makes that network call
 * retry-safe: a failed start reuses the same client guide id for five minutes.
 */
export const createRecordingSessionService = ({
  lifecycleStore,
  repository,
  resolveUserId,
  createGuide,
  deleteGuide,
  now = () => new Date(),
  pendingStartTtlMs = RECORDING_PENDING_START_TTL_MS,
}: RecordingSessionDeps) => {
  const isPendingStartFresh = (pendingStart: PendingStart): boolean => {
    const startedAt = parseTimestamp(pendingStart.startedAt);
    return startedAt !== null && now().getTime() - startedAt <= pendingStartTtlMs;
  };

  const resolvePendingStart = async (): Promise<PendingStart> => {
    const lifecycle = await lifecycleStore.get();
    const pendingStart = lifecycle.pendingStart;

    if (pendingStart && isPendingStartFresh(pendingStart)) {
      return pendingStart;
    }

    const nextPendingStart: PendingStart = {
      clientGuideId: crypto.randomUUID(),
      startedAt: now().toISOString(),
    };
    await lifecycleStore.patch({
      status: lifecycle.status,
      isSignedOut: false,
      pendingStart: nextPendingStart,
    });
    return nextPendingStart;
  };

  const findSessionForClientGuide = async (
    clientGuideId: string,
  ): Promise<LocalSession | undefined> =>
    (await repository.listSessions()).find((session) => session.clientGuideId === clientGuideId);

  const start = async (): Promise<{ sessionId: string; guideId: string }> => {
    // Persisted before any network call so a retry cannot create a second guide.
    const pendingStart = await resolvePendingStart();
    const userId = await resolveUserId();
    const guide = await createGuide({
      clientGuideId: pendingStart.clientGuideId,
      startedAt: pendingStart.startedAt,
    });

    const existing = await findSessionForClientGuide(pendingStart.clientGuideId);
    const session =
      existing ??
      (await repository.createSession({
        userId,
        guideId: guide.id,
        clientGuideId: pendingStart.clientGuideId,
        startedAt: pendingStart.startedAt,
      }));

    if (existing && existing.guideId !== guide.id) {
      await repository.setSessionGuideId(existing.id, guide.id);
    }

    await lifecycleStore.patch({
      status: "recording",
      isSignedOut: false,
      sessionId: session.id,
      pendingStart: undefined,
    });

    return { sessionId: session.id, guideId: guide.id };
  };

  const stop = async (): Promise<void> => {
    const lifecycle = await lifecycleStore.get();
    const session = lifecycle.sessionId
      ? await repository.getSession(lifecycle.sessionId)
      : undefined;

    await lifecycleStore.patch({
      status: "stopped",
      isSignedOut: false,
      pendingStart: undefined,
    });

    if (!session) {
      return;
    }

    await repository.updateSession(session.id, { stoppedAt: now().toISOString() });

    const steps = await repository.listSteps(session.id);
    if (steps.length > 0 || !session.guideId) {
      return;
    }

    try {
      await deleteGuide(session.guideId);
      await repository.setSessionGuideId(session.id, null);
    } catch (error) {
      // The empty guide is best-effort cleanup; local data stays available.
      console.warn("[background] Failed to delete empty guide:", error);
    }
  };

  const pause = async (): Promise<void> => {
    await lifecycleStore.patch({ status: "paused" });
  };

  const resume = async (): Promise<void> => {
    await lifecycleStore.patch({ status: "recording" });
  };

  const expire = async (): Promise<void> => {
    await lifecycleStore.patch({ status: "stopped", isSignedOut: true });
  };

  return { start, stop, pause, resume, expire };
};

export type RecordingSessionService = ReturnType<typeof createRecordingSessionService>;
