import type { ComponentType, PropsWithChildren } from "react";

import { useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Library, Star, Trash } from "lucide-react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import {
	ExtensionSlot,
	extensionRegistry,
	type NavItemRegistration,
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

export type NavItem = {
	label?: string;
	isSection?: boolean;
	title?: string;
	icon?: ComponentType<{ className?: string; size?: number }>;
	href?: string;
	children?: NavItem[];
	isActive?: boolean;
};

const baseNavData: NavItem[] = [
	{ label: "Insights", isSection: true },
	{
		title: "Dashboard",
		icon: LayoutDashboard,
		href: "/dashboard",
	},
	{ label: "My Workspace", isSection: true },
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

function buildPluginNavItems(): NavItem[] {
	const pluginNavItems: NavItem[] = [];

	const routeNavSections = new Map<string, NavItem[]>();

	for (const route of extensionRegistry.getRoutes()) {
		if (route.meta?.navSection) {
			const section = route.meta.navSection;
			if (!routeNavSections.has(section)) {
				routeNavSections.set(section, []);
			}
			routeNavSections.get(section)?.push({
				title: route.meta.label || route.key,
				icon: route.meta.icon,
				href: `/dashboard${route.path.startsWith("/") ? "" : "/"}${route.path}`,
			});
		}
	}

	for (const [section, items] of routeNavSections) {
		pluginNavItems.push({ label: section, isSection: true });
		pluginNavItems.push(...items);
	}

	const explicitNavItems = extensionRegistry.getNavItems();
	if (explicitNavItems.length > 0) {
		pluginNavItems.push({ label: "Extensions", isSection: true });
		for (const item of explicitNavItems) {
			pluginNavItems.push(mapNavItemRegistration(item));
		}
	}

	return pluginNavItems;
}

function mapNavItemRegistration(item: NavItemRegistration): NavItem {
	return {
		title: item.title,
		icon: item.icon,
		href: item.href,
		children: item.children?.map((child) => ({
			title: child.title,
			icon: child.icon,
			href: child.href,
		})),
	};
}

type Props = {
	user: AppUser;
};

export function DashboardLayout({ children, user }: PropsWithChildren<Props>) {
	const hideSiteHeader = useRouterState({
		select: (state) => state.matches.some((m) => !!m.context?.hideSiteHeader),
	});

	const navData = [...baseNavData, ...buildPluginNavItems()];

	return (
		<SidebarProvider>
			<Sidebar className="py-4 px-0 bg-background">
				<div className="flex flex-col gap-6 bg-background">
					<ExtensionSlot name="dashboard-sidebar-top" />
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
					<SidebarContent className="overflow-hidden gap-0 px-0">
						<SimpleBar
							autoHide={true}
							className="h-[calc(100vh-180px)] border-b border-border"
						>
							<div className="px-4">
								<NavMain items={navData} />
							</div>
						</SimpleBar>
						<ExtensionSlot name="dashboard-sidebar-bottom" />
					</SidebarContent>
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
