import { useState } from "react";

import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	FileText,
	KeyRound,
	LayoutDashboard,
	Star,
	Trash,
	Webhook,
} from "lucide-react";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/models/auth";
import { useOrgStore } from "@/stores/org-store";
import { useTeamStore } from "@/stores/team-store";
import { Logo } from "./logo";
import { ApiKeysFallback } from "../pro/api-keys-fallback";
import { WebhooksFallback } from "../pro/webhooks-fallback";
import { LearAboutProCollapsedFallback } from "../pro/learn-about-pro-collapsed-fallback";
import { LearnAboutProFallback } from "../pro/learn-about-pro-fallback";
import { ProFeatureDialog } from "../pro/pro-feature-dialog";
import { SidebarTooltip } from "./sidebar-tooltip";
import { TeamsDropdown } from "./teams-dropdown";

const nav = [
	{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
	{ label: "Guides", to: "/dashboard/guides", icon: FileText },
	{ label: "Starred", to: "/dashboard/starred", icon: Star },
	{ label: "Trash", to: "/dashboard/trash", icon: Trash },
] as const;

interface SidebarContentProps {
	user?: AppUser | null;
	onNavigate?: () => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
}

function ProNavSkeleton({ collapsed }: { collapsed: boolean }) {
	return (
		<nav className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
			{Array.from({ length: 2 }).map((_, i) => (
				<div
					key={i}
					className={cn(
						"flex items-center rounded-lg",
						collapsed ? "size-9 justify-center" : "h-8 px-3 gap-3",
					)}
				>
					<Skeleton className="shrink-0 size-4.25 rounded-md bg-sidebar-foreground/10" />
					{!collapsed && (
						<Skeleton className="h-3.5 w-20 rounded-md bg-sidebar-foreground/10" />
					)}
				</div>
			))}
		</nav>
	);
}

export function SidebarContent({
	onNavigate,
	collapsed,
	onToggleCollapse,
}: SidebarContentProps) {
	const pathname = useRouterState({ select: (r) => r.location.pathname });
	const teamLoaded = useTeamStore((s) => s.loaded);
	const orgId = useOrgStore((s) => s.orgId);
	const teams = useTeamStore((s) => s.teams);
	const hasTeamsInOrg = teams.some((t) => t.organizationId === orgId);
	const [activeDialog, setActiveDialog] = useState<
		"webhooks" | "api-keys" | null
	>(null);

	return (
		<TooltipProvider delayDuration={0}>
			{/* Header: Logo + Collapse Button */}
			<div
				className={cn(
					"mb-2 flex items-center shrink-0",
					collapsed
						? "flex-col gap-2 pt-3 pb-1 px-2"
						: "justify-between px-4 pt-3 pb-2",
				)}
			>
				<Logo collapsed={collapsed} />
				<button
					type="button"
					onClick={onToggleCollapse}
					className={cn(
						"flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-surface-hover transition-all duration-200",
						collapsed ? "size-7" : "size-6",
					)}
					aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{collapsed ? (
						<ChevronRight className="size-3.5" />
					) : (
						<ChevronLeft className="size-3.5" />
					)}
				</button>
			</div>

			{/* Navigation */}
			<nav
				className={cn(
					"flex flex-col gap-0.5 shrink-0",
					collapsed ? "px-3 items-center" : "px-3",
				)}
			>
				{!teamLoaded
					? nav.map((item) => (
							<div
								key={item.to}
								className={cn(
									"flex items-center rounded-lg",
									collapsed ? "size-9 justify-center" : "h-10 p-3 gap-3",
								)}
							>
								<Skeleton
									className={cn(
										"shrink-0 rounded-md bg-sidebar-foreground/10",
										collapsed ? "size-4.5" : "size-4.25",
									)}
								/>
								{!collapsed && (
									<Skeleton className="h-3.5 w-20 rounded-md bg-sidebar-foreground/10" />
								)}
							</div>
						))
					: nav.map((item) => {
							const active = pathname === item.to;
							const Icon = item.icon;
							return (
								<SidebarTooltip
									key={item.to}
									collapsed={collapsed}
									label={item.label}
								>
									<Link
										to={item.to}
										aria-label={collapsed ? item.label : undefined}
										className={cn(
											"group relative flex items-center rounded-lg text-[13.5px] transition-premium",
											collapsed ? "size-9 justify-center" : "h-10 p-3 gap-3",
											active
												? "text-foreground"
												: "text-muted-foreground/70 hover:text-foreground hover:bg-surface-hover",
										)}
										onClick={onNavigate}
									>
										{active && (
											<span className="absolute inset-0 rounded-lg bg-linear-to-r from-primary/20 via-primary/10 to-transparent ring-1 ring-inset ring-primary/20" />
										)}
										<Icon
											className={cn(
												"relative shrink-0",
												collapsed ? "size-4.5" : "size-4.25",
												active ? "text-primary" : "",
											)}
											strokeWidth={active ? 2.25 : 1.9}
										/>
										{!collapsed && (
											<span className="relative font-medium">{item.label}</span>
										)}
									</Link>
								</SidebarTooltip>
							);
						})}
			</nav>

			{/* Teams Section */}
			<div className={cn("mt-3 shrink-0", collapsed ? "px-3" : "px-3")}>
				{!collapsed && (
					<div className="flex items-center justify-between px-3 mb-1.5">
						<span className="text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
							{!teamLoaded ? "" : hasTeamsInOrg && "Teams"}
						</span>
					</div>
				)}
				<div
					className={cn("flex flex-col gap-0.5", collapsed && "items-center")}
				>
					{!teamLoaded ? (
						<div className={cn(collapsed ? "" : "px-1")}>
							<Skeleton
								className={cn(
									"rounded-md bg-sidebar-foreground/10",
									collapsed ? "size-9" : "h-10 w-full",
								)}
							/>
						</div>
					) : (
						hasTeamsInOrg && (
							<div className={cn(collapsed ? "" : "px-1")}>
								<TeamsDropdown collapsed={collapsed} />
							</div>
						)
					)}
				</div>
			</div>

			{/* Pro section */}
			<div
				className={cn(
					"mt-3 shrink-0",
					collapsed ? "px-3 items-center" : "px-3",
				)}
			>
				{!collapsed && teamLoaded && (
					<div className="px-3 mb-1.5">
						<span className="text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
							Pro
						</span>
					</div>
				)}
				{!teamLoaded ? (
					<ProNavSkeleton collapsed={collapsed} />
				) : (
					<nav
						className={cn("flex flex-col gap-0.5", collapsed && "items-center")}
					>
						<SidebarTooltip collapsed={collapsed} label="Webhooks">
							<button
								type="button"
								aria-label={collapsed ? "Webhooks" : undefined}
								className={cn(
									"group relative flex items-center rounded-lg text-[13.5px] transition-premium cursor-pointer",
									collapsed ? "size-9 justify-center" : "h-8 px-3 gap-3",
									"text-muted-foreground/70 hover:text-foreground hover:bg-surface-hover",
								)}
								onClick={() => setActiveDialog("webhooks")}
							>
								<Webhook
									className="relative shrink-0 size-4.25"
									strokeWidth={1.9}
								/>
								{!collapsed && (
									<span className="relative font-medium">Webhooks</span>
								)}
							</button>
						</SidebarTooltip>
						<SidebarTooltip collapsed={collapsed} label="API Keys">
							<button
								type="button"
								aria-label={collapsed ? "API Keys" : undefined}
								className={cn(
									"group relative flex items-center rounded-lg text-[13.5px] transition-premium cursor-pointer",
									collapsed ? "size-9 justify-center" : "h-8 px-3 gap-3",
									"text-muted-foreground/70 hover:text-foreground hover:bg-surface-hover",
								)}
								onClick={() => setActiveDialog("api-keys")}
							>
								<KeyRound
									className="relative shrink-0 size-4.25"
									strokeWidth={1.9}
								/>
								{!collapsed && (
									<span className="relative font-medium">API Keys</span>
								)}
							</button>
						</SidebarTooltip>
					</nav>
				)}
			</div>

			{/* Bottom section */}
			<div
				className={cn(
					"mt-auto flex flex-col gap-2 shrink-0",
					collapsed ? "px-2 pb-3 items-center" : "px-3 pb-3",
				)}
			>
				{teamLoaded &&
					(collapsed ? (
						<>
							<ExtensionSlot
								name="dashboard-sidebar-learn-about-pro-upgrade-collapsed"
								fallback={LearAboutProCollapsedFallback}
							/>
							<ExtensionSlot name="dashboard-sidebar-stats-collapsed" />
						</>
					) : (
						<>
							<ExtensionSlot
								name="dashboard-sidebar-learn-about-pro-upgrade"
								fallback={LearnAboutProFallback}
							/>
							<ExtensionSlot name="dashboard-sidebar-stats" />
						</>
					))}
			</div>

			{/* Pro feature dialogs */}
			<ProFeatureDialog
				slotName="dashboard-sidebar-webhooks"
				open={activeDialog === "webhooks"}
				onOpenChange={(o) => !o && setActiveDialog(null)}
				FallbackComponent={WebhooksFallback}
			/>
			<ProFeatureDialog
				slotName="dashboard-sidebar-api-keys"
				open={activeDialog === "api-keys"}
				onOpenChange={(o) => !o && setActiveDialog(null)}
				FallbackComponent={ApiKeysFallback}
			/>
		</TooltipProvider>
	);
}

type AppSidebarProps = {
	collapsed: boolean;
	onToggleCollapse: () => void;
};

export function AppSidebar({ collapsed, onToggleCollapse }: AppSidebarProps) {
	return (
		<aside
			className={cn(
				"hidden md:flex h-screen sticky top-0 shrink-0 flex-col overflow-hidden bg-sidebar transition-[width] duration-250 ease-in-out border-r",
				collapsed ? "w-18" : "w-70",
			)}
		>
			<SidebarContent
				collapsed={collapsed}
				onToggleCollapse={onToggleCollapse}
			/>
		</aside>
	);
}
