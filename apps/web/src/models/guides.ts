import type { Guide } from "@repo/api-client";

export type GuideAction = "publish" | "archive" | "unarchive" | "restore" | "duplicate" | "delete";

const DASHBOARD_GUIDE_PATH = /^\/dashboard\/guides\/([^/]+)\/?$/;

export function getGuideIdFromDashboardPath(pathname: string): string | null {
  return DASHBOARD_GUIDE_PATH.exec(pathname)?.[1] ?? null;
}

export function getPublicGuideUrl(origin: string, guideId: string): string {
  return `${origin}/guides/${guideId}`;
}

export const PUBLIC_DRAFT_HINT = "Only visible to others once published";

export function getGuideLinkAudience(guide: Pick<Guide, "visibility" | "status">): string {
  switch (guide.visibility) {
    case "public":
      return guide.status === "published"
        ? "Anyone with the link can view this guide"
        : PUBLIC_DRAFT_HINT;
    case "team":
      return "Only your team can view this guide";
    case "private":
      return "Only you can view this guide";
  }
}
