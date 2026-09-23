import type { ActivityLog } from "@repo/api-client";

const GUIDE_TARGET_TYPE = "guide";

export type ActivityDetails = {
  actorId: string;
  actorName: string;
  guideId?: string;
  guideTitle: string;
};

export function getActivityDetails(log: ActivityLog): ActivityDetails {
  return {
    actorId: log.actorId,
    actorName: log.metadata.user?.name || "Someone",
    guideId: log.targetType === GUIDE_TARGET_TYPE ? log.targetId : undefined,
    guideTitle: log.metadata.guide?.title || "Untitled guide",
  };
}

export function mergeActivityLogs(
  existing: ActivityLog[],
  incoming: ActivityLog,
  limit: number,
): ActivityLog[] {
  return [incoming, ...existing.filter((log) => log.id !== incoming.id)].slice(0, limit);
}
