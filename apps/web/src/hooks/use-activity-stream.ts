import { useQueryClient } from "@tanstack/react-query";

import { toCamelCaseKeys } from "es-toolkit";

import type {
  ActivityLog,
  ListActivityLogsParams,
  ListActivityLogsResponse,
} from "@repo/api-client";
import { api } from "@repo/api-client";

import { useRealtimeEvent } from "@/components/providers/realtime-provider";
import { REALTIME_EVENTS } from "@/constants/realtime";
import { mergeActivityLogs } from "@/models";

export function useActivityStream(params: ListActivityLogsParams) {
  const queryClient = useQueryClient();
  const limit = params.limit ?? 10;
  const queryKey = api.activityLogs.getListActivityLogsQueryKey({ team_id: params.team_id, limit });

  useRealtimeEvent(REALTIME_EVENTS.activity, (event) => {
    const incoming = toCamelCaseKeys(JSON.parse(event.data)) as ActivityLog;
    queryClient.setQueryData<ListActivityLogsResponse>(queryKey, (current) => ({
      ...current,
      data: mergeActivityLogs(current?.data ?? [], incoming, limit),
    }));
  });

  useRealtimeEvent("open", () => {
    void queryClient.invalidateQueries({ queryKey });
  });
}
