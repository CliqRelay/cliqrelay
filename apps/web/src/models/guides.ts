export type GuideAction = "publish" | "archive" | "unarchive" | "restore" | "duplicate" | "delete";

const DASHBOARD_GUIDE_PATH = /^\/dashboard\/guides\/([^/]+)\/?$/;

export function getGuideIdFromDashboardPath(pathname: string): string | null {
  return DASHBOARD_GUIDE_PATH.exec(pathname)?.[1] ?? null;
}

export const PUBLIC_DRAFT_HINT = "Only visible to others once published";
