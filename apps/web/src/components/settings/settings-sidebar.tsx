import { Link, useParams, useRouterState } from "@tanstack/react-router";
import {
	Building2,
	Layers,
	Palette,
	Plug,
	Settings,
	Users,
} from "lucide-react";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { cn } from "@/lib/utils";
import { useOrgStore } from "@/stores/org-store";

const allSections = [
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
	{
		id: "teams",
		label: "Teams",
		icon: Layers,
		to: "/dashboard/organizations/$orgId/settings/teams",
		adminOnly: true,
	},
	{
		id: "branding",
		label: "Branding",
		icon: Palette,
		to: "/dashboard/organizations/$orgId/settings/branding",
		adminOnly: true,
	},
	{
		id: "integrations",
		label: "Integrations",
		icon: Plug,
		to: "/dashboard/organizations/$orgId/settings/integrations",
		adminOnly: true,
	},
] as const;

type Section = (typeof allSections)[number];

export function SettingsSidebar() {
	const orgName = useOrgStore((state) => state.orgName);
	const currentMember = useOrgStore((state) => state.currentMember);
	const { orgId } = useParams({
		from: "/dashboard/organizations/$orgId/settings",
	});

	const location = useRouterState({ select: (s) => s.location });

	const role = currentMember?.role ?? "";
	const isAdmin = role === "owner" || role === "admin";

	const sections = allSections.filter(
		(s) => !("adminOnly" in s && s.adminOnly) || isAdmin,
	) as Section[];

	const activeSection =
		sections.find((s) => location.pathname.endsWith(s.id))?.id ?? "general";

	return (
		<div className="flex flex-col w-64 shrink-0 border-r">
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
				{sections.map((section) => {
					const isActive = activeSection === section.id;
					return (
						<Link
							key={section.id}
							to={section.to}
							params={{ orgId }}
							className={cn(
								"flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
								isActive
									? "bg-accent text-accent-foreground shadow-sm"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
							)}
						>
							<section.icon size={16} className="shrink-0" />
							{section.label}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
