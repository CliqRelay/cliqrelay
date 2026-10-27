import { Link, useParams, useRouterState } from "@tanstack/react-router";

import type { OrganizationTeam } from "authula/models";

import { ArrowLeft, Settings, Users } from "lucide-react";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { ExtensionSlotKeys } from "@/constants/extension-slots";
import { cn } from "@/lib/utils";

const sections = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    to: "/dashboard/organizations/$orgId/teams/$teamId/settings/general",
  },
  {
    id: "members",
    label: "Members",
    icon: Users,
    to: "/dashboard/organizations/$orgId/teams/$teamId/settings/members",
  },
] as const;

type Props = {
  team: OrganizationTeam;
};

export function TeamSettingsSidebar({ team }: Props) {
  const { orgId, teamId } = useParams({
    from: "/dashboard/organizations/$orgId/teams/$teamId/settings",
  });

  const location = useRouterState({ select: (s) => s.location });
  const activeSection = sections.find((s) => location.pathname.endsWith(s.id))?.id ?? "general";

  return (
    <div className="flex w-64 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <span className="text-sm font-bold text-primary">
            {team.name?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Settings</span>
          <span className="max-w-40 truncate text-xs text-muted-foreground">{team.name}</span>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-auto p-2">
        <Link
          to="/dashboard/organizations/$orgId/settings/teams"
          params={{ orgId }}
          className="mb-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-accent/50 hover:text-foreground"
        >
          <ArrowLeft size={14} className="shrink-0" />
          <span>Back to Teams</span>
        </Link>
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <Link
              key={s.id}
              to={s.to}
              params={{ orgId, teamId }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <s.icon size={16} className="shrink-0" />
              {s.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <ExtensionSlot name={ExtensionSlotKeys.TEAM_SETTINGS_SIDEBAR_BOTTOM} />
      </div>
    </div>
  );
}
