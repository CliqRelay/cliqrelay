import { Globe, Lock, Users } from "lucide-react";

import type { GuideStatus, Visibility } from "@repo/api-client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PUBLIC_DRAFT_HINT } from "@/models";

type Props = {
  visibility: Visibility;
  status: GuideStatus;
};

const VISIBILITY_BADGES = {
  private: { icon: Lock, label: "Private" },
  team: { icon: Users, label: "Team" },
  public: { icon: Globe, label: "Public" },
} as const;

export function GuideVisibilityBadge({ visibility, status }: Props) {
  const { icon: Icon, label } = VISIBILITY_BADGES[visibility];

  const badge = (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Icon className="size-3" />
      {label}
    </span>
  );

  if (visibility !== "public" || status === "published") {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="bottom">{PUBLIC_DRAFT_HINT}</TooltipContent>
    </Tooltip>
  );
}
