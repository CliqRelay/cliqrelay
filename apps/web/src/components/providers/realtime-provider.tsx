import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type ReactNode,
} from "react";

import { api } from "@repo/api-client";

import type { RealtimeEventType } from "@/models";
import { useTeamStore } from "@/stores";
import { getCsrfTokenHeader } from "@/utils/http.utils";

const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

// "open" fires on every (re)connect, so subscribers can resync anything they missed.
type RealtimeEventName = RealtimeEventType | "open";
type RealtimeEventHandler = (event: MessageEvent<string>) => void;
type Subscribe = (type: RealtimeEventName, handler: RealtimeEventHandler) => () => void;

const RealtimeContext = createContext<Subscribe | null>(null);

function createRealtimeHub() {
  const handlers = new Map<RealtimeEventName, Set<RealtimeEventHandler>>();
  let source: EventSource | undefined;

  const dispatch = (event: Event) => {
    handlers
      .get(event.type as RealtimeEventName)
      ?.forEach((handler) => handler(event as MessageEvent<string>));
  };

  const subscribe: Subscribe = (type, handler) => {
    let typeHandlers = handlers.get(type);
    if (!typeHandlers) {
      typeHandlers = new Set();
      handlers.set(type, typeHandlers);
      source?.addEventListener(type, dispatch);
    }
    typeHandlers.add(handler);
    return () => typeHandlers.delete(handler);
  };

  const attach = (next: EventSource) => {
    source = next;
    handlers.forEach((_, type) => next.addEventListener(type, dispatch));
  };

  return { subscribe, attach };
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const teamId = useTeamStore((s) => s.activeTeamId) ?? undefined;
  const { mutateAsync: connectRealtime } = api.realtime.useConnectRealtime({
    request: { credentials: "include", headers: { ...getCsrfTokenHeader() } },
  });
  const [hub] = useState(createRealtimeHub);

  useEffect(() => {
    if (!teamId) return;

    let source: EventSource | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    // Stream URLs carry a single-use ticket, so EventSource's own reconnect
    // would always be rejected; every retry asks for a fresh URL instead.
    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(INITIAL_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS);
      attempt += 1;
      retryTimer = setTimeout(connect, delay);
    };

    async function connect() {
      try {
        const { url } = await connectRealtime({ params: { team_id: teamId } });
        if (disposed) return;

        source = new EventSource(url);
        hub.attach(source);
        source.addEventListener("open", () => {
          attempt = 0;
        });
        source.addEventListener("error", () => {
          source?.close();
          scheduleReconnect();
        });
      } catch {
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      source?.close();
    };
  }, [teamId, connectRealtime, hub]);

  return <RealtimeContext value={hub.subscribe}>{children}</RealtimeContext>;
}

export function useRealtimeEvent(type: RealtimeEventName, handler: RealtimeEventHandler) {
  const subscribe = useContext(RealtimeContext);
  if (!subscribe) {
    throw new Error("useRealtimeEvent must be used within a RealtimeProvider");
  }
  const onEvent = useEffectEvent(handler);

  useEffect(() => subscribe(type, (event) => onEvent(event)), [subscribe, type]);
}
