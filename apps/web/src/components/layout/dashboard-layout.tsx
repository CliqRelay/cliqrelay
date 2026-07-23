import type { PropsWithChildren } from "react";

import { useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Library, Star, Trash } from "lucide-react";

import {
	ExtensionSlot,
	extensionRegistry,
	type NavItem,
} from "@repo/extensions-sdk";

import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarProvider,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { SiteHeader } from "./site-header";
import type { AppUser } from "@/models/auth";
import { useWorkspaceStore } from "@/stores/workspace-store";

const baseNavData: NavItem[] = [
	{
		title: "Dashboard",
		icon: LayoutDashboard,
		href: "/dashboard",
	},
	{
		title: "My Guides",
		icon: Library,
		href: "/dashboard/guides",
	},
	{
		title: "Starred",
		icon: Star,
		href: "/dashboard/starred",
	},
	{
		title: "Trash",
		icon: Trash,
		href: "/dashboard/trash",
	},
];

type Props = {
	user: AppUser;
};

export function DashboardLayout({ children, user }: PropsWithChildren<Props>) {
	const hideSiteHeader = useRouterState({
		select: (state) => state.matches.some((m) => !!m.context?.hideSiteHeader),
	});
	const workspaces = useWorkspaceStore((state) => state.workspaces);

	const navData: NavItem[] = [
		...baseNavData,
		...[
			{
				label: "Workspaces",
				isSection: true,
			} as NavItem,
			...workspaces.map(
				(workspace) =>
					({
						title: workspace.name,
						icon: Trash,
					}) as NavItem,
			),
		],
		...(extensionRegistry.getNavItems() ?? []),
	];

	return (
		<SidebarProvider>
			<Sidebar className="pt-4 px-0 bg-background">
				<div className="flex flex-col gap-6 bg-background min-h-0 flex-1">
					<SidebarHeader className="py-0 px-4">
						<SidebarMenu>
							<SidebarMenuItem>
								<img
									src="/app-logo-dark.png"
									alt="CliqRelay Logo"
									height="125"
									width="125"
									className="block dark:hidden"
								/>
								<img
									src="/app-logo-light.png"
									alt="CliqRelay Logo"
									height="125"
									width="125"
									className="hidden dark:block"
								/>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>
					<SidebarContent className="overflow-hidden gap-0 px-0 flex-1">
						<div className="px-4">
							<NavMain items={navData} />
						</div>
					</SidebarContent>
					<div className="mt-auto">
						<ExtensionSlot name="dashboard-sidebar-bottom" />
					</div>
				</div>
			</Sidebar>
			<div className="flex flex-1 flex-col">
				{!hideSiteHeader && (
					<header className="sticky top-0 z-50 flex items-center border-b px-6 py-3 bg-background">
						<SiteHeader user={user} />
					</header>
				)}
				<main className="w-full mx-auto flex-1">{children}</main>
			</div>
		</SidebarProvider>
	);
}
