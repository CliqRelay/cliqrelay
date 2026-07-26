import { Link, useParams, useRouterState } from "@tanstack/react-router";
import { Building2, Settings, Users } from "lucide-react";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { cn } from "@/lib/utils";
import { useOrgStore } from "@/stores/org-store";

const sections = [
	{
		id: "general",
		label: "General",
		icon: Settings,
		to: "/dashboard/organizations/$orgId/settings/general",
	},
	{
		id: "members",
		label: "Members",
		icon: Users,
		to: "/dashboard/organizations/$orgId/settings/members",
	},
] as const;

export function SettingsSidebar() {
	const orgName = useOrgStore((state) => state.orgName);
	const { orgId } = useParams({
		from: "/dashboard/organizations/$orgId/settings",
	});

	const location = useRouterState({ select: (s) => s.location });
	const activeSection =
		sections.find((s) => location.pathname.endsWith(s.id))?.id ?? "general";

	return (
		<div className="flex flex-col w-64 shrink-0 border-r bg-background">
			<div className="flex h-14 items-center gap-3 border-b px-4">
				<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
					<Building2 size={16} className="text-primary" />
				</div>
				<div className="flex flex-col">
					<span className="text-sm font-semibold">Settings</span>
					<span className="text-xs text-muted-foreground truncate max-w-40">
						{orgName}
					</span>
				</div>
			</div>
			<nav className="flex-1 p-2 space-y-0.5 overflow-auto">
				{sections.map((s) => {
					const isActive = activeSection === s.id;
					return (
						<Link
							key={s.id}
							to={s.to}
							params={{ orgId }}
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
			<div className="p-2 border-t">
				<ExtensionSlot name="org-settings-sidebar-bottom" />
			</div>
		</div>
	);
}
