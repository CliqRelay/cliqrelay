import { type ComponentType, useState } from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import {
	BarChart3,
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
import { useOrgStore, useTeamStore } from "@/stores";
import { Logo } from "./logo";
import { AnalyticsFallback } from "../pro/analytics-fallback";
import { ApiKeysFallback } from "../pro/api-keys-fallback";
import { WebhooksFallback } from "../pro/webhooks-fallback";
import { LearnAboutProCollapsedFallback } from "../pro/learn-about-pro-collapsed-fallback";
import { LearnAboutProFallback } from "../pro/learn-about-pro-fallback";
import { ProFeatureDialog } from "../pro/pro-feature-dialog";
import { SidebarTooltip } from "./sidebar-tooltip";
import { TeamsDropdown } from "./teams-dropdown";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

type DialogType = "analytics" | "webhooks" | "api-keys";

type ProItem = {
	label: string;
	icon: ComponentType<{ className?: string; strokeWidth?: number }>;
	dialog: DialogType;
	slotName: string;
	fallback: ComponentType<{
		isUpgradeAvailable: boolean;
		onUpgrade?: () => Promise<void>;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}>;
};

const proItems: ProItem[] = [
	{
		label: "Analytics",
		icon: BarChart3,
		dialog: "analytics",
		slotName: "dashboard-sidebar-analytics",
		fallback: AnalyticsFallback,
	},
	{
		label: "Webhooks",
		icon: Webhook,
		dialog: "webhooks",
		slotName: "dashboard-sidebar-webhooks",
		fallback: WebhooksFallback,
	},
	{
		label: "API Keys",
		icon: KeyRound,
		dialog: "api-keys",
		slotName: "dashboard-sidebar-api-keys",
		fallback: ApiKeysFallback,
	},
];

type SidebarContentProps = {
	user?: AppUser | null;
	onNavigate?: () => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
};

function SectionLabel({
	collapsed,
	label,
}: {
	collapsed: boolean;
	label: string;
}) {
	if (collapsed) return null;
	return (
		<div className="px-3 mb-1.5">
			<span className="text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
				{label}
			</span>
		</div>
	);
}

function NavSkeleton({
	collapsed,
	count,
}: {
	collapsed: boolean;
	count: number;
}) {
	return (
		<nav className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
			{Array.from({ length: count }).map((_, i) => (
				<div
					key={i}
					className={cn(
						"flex items-center rounded-lg",
						collapsed ? "size-9 justify-center" : "h-10 p-3 gap-3",
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

function NavLink({
	collapsed,
	to,
	label,
	icon: Icon,
	active,
	onClick,
}: {
	collapsed: boolean;
	to: string;
	label: string;
	icon: ComponentType<{ className?: string; strokeWidth?: number }>;
	active: boolean;
	onClick?: () => void;
}) {
	return (
		<SidebarTooltip collapsed={collapsed} label={label}>
			<Link
				to={to}
				aria-label={collapsed ? label : undefined}
				className={cn(
					"group relative flex items-center rounded-lg text-[13.5px] transition-premium",
					collapsed ? "size-9 justify-center" : "h-10 p-3 gap-3",
					active
						? "text-foreground"
						: "text-muted-foreground/70 hover:text-foreground hover:bg-surface-hover",
				)}
				onClick={onClick}
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
				{!collapsed && <span className="relative font-medium">{label}</span>}
			</Link>
		</SidebarTooltip>
	);
}

function ProNavButton({
	collapsed,
	label,
	icon: Icon,
	onClick,
}: {
	collapsed: boolean;
	label: string;
	icon: ComponentType<{ className?: string; strokeWidth?: number }>;
	onClick: () => void;
}) {
	return (
		<SidebarTooltip collapsed={collapsed} label={label}>
			<button
				type="button"
				aria-label={collapsed ? label : undefined}
				className={cn(
					"group relative flex items-center rounded-lg text-[13.5px] transition-premium cursor-pointer",
					collapsed ? "size-9 justify-center" : "h-8 px-3 gap-3",
					"text-muted-foreground/70 hover:text-foreground hover:bg-surface-hover",
				)}
				onClick={onClick}
			>
				<Icon className="relative shrink-0 size-4.25" strokeWidth={1.9} />
				{!collapsed && <span className="relative font-medium">{label}</span>}
			</button>
		</SidebarTooltip>
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

	const [activeDialog, setActiveDialog] = useState<DialogType | null>(null);

	const nav = [
		{
			label: "Dashboard",
			to: "/dashboard",
			icon: LayoutDashboard,
			canAccess: true,
		},
		{
			label: "Guides",
			to: "/dashboard/guides",
			icon: FileText,
			canAccess: hasTeamsInOrg,
		},
		{
			label: "Starred",
			to: "/dashboard/starred",
			icon: Star,
			canAccess: hasTeamsInOrg,
		},
		{
			label: "Trash",
			to: "/dashboard/trash",
			icon: Trash,
			canAccess: hasTeamsInOrg,
		},
	] as const;

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
				{!teamLoaded ? (
					<NavSkeleton collapsed={collapsed} count={nav.length} />
				) : (
					nav
						.filter((item) => item.canAccess)
						.map((item) => (
							<NavLink
								key={item.to}
								collapsed={collapsed}
								to={item.to}
								label={item.label}
								icon={item.icon}
								active={pathname === item.to}
								onClick={onNavigate}
							/>
						))
				)}
			</nav>

			{/* Teams Section */}
			<div className={cn("mt-3 shrink-0", collapsed ? "px-3" : "px-3")}>
				{!collapsed && hasTeamsInOrg && (
					<div className="flex items-center justify-between px-3 mb-1.5">
						<span className="text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
							Teams
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
				{teamLoaded && <SectionLabel collapsed={collapsed} label="Pro" />}
				{!teamLoaded ? (
					<NavSkeleton collapsed={collapsed} count={proItems.length} />
				) : (
					<nav
						className={cn("flex flex-col gap-0.5", collapsed && "items-center")}
					>
						{proItems.map((item) => (
							<ProNavButton
								key={item.dialog}
								collapsed={collapsed}
								label={item.label}
								icon={item.icon}
								onClick={() => setActiveDialog(item.dialog)}
							/>
						))}
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
						<ExtensionSlot
							name={ExtensionSlotKeys.DASHBOARD_SIDEBAR_PRO_UPGRADE_COLLAPSED}
							fallback={LearnAboutProCollapsedFallback}
						/>
					) : (
						<ExtensionSlot
							name={ExtensionSlotKeys.DASHBOARD_SIDEBAR_PRO_UPGRADE}
							fallback={LearnAboutProFallback}
						/>
					))}
			</div>

			{/* Pro feature dialogs */}
			{proItems.map((item) => (
				<ProFeatureDialog
					key={item.dialog}
					slotName={item.slotName}
					open={activeDialog === item.dialog}
					onOpenChange={(o) => !o && setActiveDialog(null)}
					FallbackComponent={item.fallback}
				/>
			))}
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
