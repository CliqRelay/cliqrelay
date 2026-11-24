import { useEffect, useState } from "react";

import { browser } from "wxt/browser";

import {
  type OutboxLifecycle,
  outboxLifecycleSchema,
  type RecordingLifecycle,
  recordingLifecycleSchema,
} from "@/models";
import { STORAGE_KEY_RECORDING_LIFECYCLE } from "@/utils/constants";

export type RecordingLifecycleState = {
  lifecycle: OutboxLifecycle | undefined;
  status: OutboxLifecycle["status"] | undefined;
  sessionId: string | undefined;
  isSignedOut: boolean;
  isLoading: boolean;
};

type LifecycleChange = { newValue?: unknown };
type LifecycleListener = (changes: Record<string, LifecycleChange>) => void;

/**
 * PR 2 wrote the lifecycle without the outbox fields. Reading it keeps the
 * sidepanel working during the PR 5 rollout window.
 */
export const parseRecordingLifecycle = (value: unknown): OutboxLifecycle | undefined => {
  const parsed = outboxLifecycleSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const legacy = recordingLifecycleSchema.safeParse(value);
  if (legacy.success) {
    return toOutboxLifecycle(legacy.data);
  }

  return undefined;
};

const toOutboxLifecycle = (lifecycle: RecordingLifecycle): OutboxLifecycle => ({
  ...lifecycle,
  isSignedOut: false,
});

const readLifecycle = async (): Promise<unknown> => {
  try {
    const stored = await browser.storage.session.get(STORAGE_KEY_RECORDING_LIFECYCLE);
    return stored[STORAGE_KEY_RECORDING_LIFECYCLE];
  } catch {
    return undefined;
  }
};

/**
 * Recording status is authoritative only in `storage.session`. The sidepanel
 * never infers it from Dexie or a push message.
 */
export const useRecordingLifecycle = (): RecordingLifecycleState => {
  const [lifecycle, setLifecycle] = useState<OutboxLifecycle | undefined>(undefined);
  // A `stopped` write may omit the session id while the outbox drains; keep the
  // last live id so the panel can still show the finished session.
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isDisposed = false;

    const apply = (value: unknown) => {
      if (isDisposed) {
        return;
      }

      const next = parseRecordingLifecycle(value);
      setLifecycle(next);

      if (!next || next.status === "idle") {
        setSessionId(undefined);
      } else if (next.sessionId) {
        setSessionId(next.sessionId);
      }

      setIsLoading(false);
    };

    const listener: LifecycleListener = (changes) => {
      const change = changes[STORAGE_KEY_RECORDING_LIFECYCLE];
      if (!change) {
        return;
      }

      apply(change.newValue);
    };

    browser.storage.session.onChanged.addListener(listener);
    void readLifecycle().then(apply);

    return () => {
      isDisposed = true;
      browser.storage.session.onChanged.removeListener(listener);
    };
  }, []);

  return {
    lifecycle,
    status: lifecycle?.status,
    sessionId,
    isSignedOut: lifecycle?.isSignedOut ?? false,
    isLoading,
  };
};
