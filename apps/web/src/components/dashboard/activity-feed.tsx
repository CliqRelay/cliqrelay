import { Link } from "@tanstack/react-router";

import { Activity } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { ActivityLog } from "@repo/api-client";
import { api } from "@repo/api-client";

import { UserAvatar } from "@/components/shared/user-avatar";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVITY_EVENT_CONFIG } from "@/constants/activity";
import { useActivityStream } from "@/hooks/use-activity-stream";
import { useRerenderInterval } from "@/hooks/use-rerender-interval";
import { getActivityDetails } from "@/models";
import { useTeamStore } from "@/stores";
import { timeAgo } from "@/utils/time.utils";

const ACTIVITY_LIMIT = 10;
const TIME_AGO_REFRESH_MS = 10_000;

// Covers event types added on the server before the web app is redeployed.
const FALLBACK_EVENT = { icon: Activity, verb: "changed" };

function ActivityFeedHeader() {
  return (
    <div className="flex items-center gap-2 px-5 py-4">
      <Activity className="size-4 text-primary" />
      <h3 className="text-[14px] font-semibold text-foreground">Team Activity</h3>
    </div>
  );
}

function TimeAgo({ date }: { date: string }) {
  useRerenderInterval(TIME_AGO_REFRESH_MS);

  return (
    <time
      dateTime={date}
      title={new Date(date).toLocaleString()}
      className="ml-auto shrink-0 pl-2 text-[11px] text-muted-foreground/70"
    >
      {timeAgo(date)}
    </time>
  );
}

function ActivityRow({ log, index }: { log: ActivityLog; index: number }) {
  const reduceMotion = useReducedMotion();
  const { actorId, actorName, guideId, guideTitle } = getActivityDetails(log);
  const { icon: Icon, verb } = ACTIVITY_EVENT_CONFIG[log.eventType] ?? FALLBACK_EVENT;

  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      // The stagger only applies on entry, so rows shifting down for a new item move together.
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.25, ease: "easeOut", delay: Math.min(index, 9) * 0.04 },
      }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-hover"
    >
      <UserAvatar user={{ id: actorId, name: actorName }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12.5px] leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">{actorName}</span>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span>{verb}</span>
          <TimeAgo date={log.createdAt} />
        </div>
        {guideId && log.eventType !== "guide.deleted" ? (
          <Link
            to="/dashboard/guides/$guideId"
            params={{ guideId }}
            className="block w-fit max-w-full truncate rounded-sm text-[12.5px] font-medium text-blue-500 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {guideTitle}
          </Link>
        ) : (
          <div className="truncate text-[12.5px] text-muted-foreground">{guideTitle}</div>
        )}
      </div>
    </motion.li>
  );
}

export function ActivityFeedList({
  items,
  isLoading,
}: {
  items: ActivityLog[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="overflow-hidden surface-card rounded-[20px]" aria-busy="true">
        <ActivityFeedHeader />
        <div className="space-y-1 px-2 pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              data-testid="activity-skeleton"
              className="flex items-start gap-3 px-3 py-3"
            >
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="overflow-hidden surface-card rounded-[20px]">
        <ActivityFeedHeader />
        <Empty className="border-0 px-6 py-10">
          <EmptyMedia variant="icon">
            <Activity className="size-5" />
          </EmptyMedia>
          <EmptyHeader className="max-w-full">
            <EmptyTitle>No activity yet</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="overflow-hidden surface-card rounded-[20px]">
      <ActivityFeedHeader />
      <ul
        className="max-h-80 overflow-y-auto overscroll-contain px-2 pb-2"
        data-testid="activity-list"
      >
        <AnimatePresence initial={false}>
          {items.map((log, index) => (
            <ActivityRow key={log.id} log={log} index={index} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export function ActivityFeed() {
  const teamId = useTeamStore((s) => s.activeTeamId) ?? undefined;
  const params = { team_id: teamId, limit: ACTIVITY_LIMIT };

  const { data: activityLogsResponse, isLoading } = api.activityLogs.useListActivityLogs(params, {
    query: { enabled: !!teamId },
    request: { credentials: "include" },
  });
  useActivityStream(params);

  return (
    <ActivityFeedList items={activityLogsResponse?.data ?? []} isLoading={!!teamId && isLoading} />
  );
}
