import type { PropsWithChildren } from "react";
import { useCallback } from "react";

import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Library, Star, Trash, Users } from "lucide-react";

import {
	ExtensionSlot,
	extensionRegistry,
	type NavItem,
} from "@repo/extensions-sdk";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { NavMain } from "./nav-main";
import { SiteHeader } from "./site-header";
import type { AppUser } from "@/models/auth";
import { useTeamStore } from "@/stores/team-store";
import { setActiveTeamCookie } from "@/lib/team-cookie";

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
	const teams = useTeamStore((state) => state.teams);
	const activeTeamId = useTeamStore((state) => state.activeTeamId);
	const setActiveTeam = useTeamStore((state) => state.setActiveTeam);
	const navigate = useNavigate();

	const switchTeam = useCallback(
		(teamId: string) => {
			setActiveTeamCookie(teamId);
			setActiveTeam(teamId);
			navigate({ to: "/dashboard" });
		},
		[setActiveTeam, navigate],
	);

	const navData: NavItem[] = [
		...baseNavData,
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
							{teams.length > 0 && (
								<SidebarGroup className="p-0 pt-5">
									<SidebarGroupLabel className="p-0 text-xs font-medium uppercase text-sidebar-foreground">
										Teams
									</SidebarGroupLabel>
									<SidebarMenu className="mt-2">
										{teams.map((team) => {
											const isActive = team.id === activeTeamId;
											return (
												<SidebarMenuItem key={team.id}>
													<SidebarMenuButton
														tooltip={team.name}
														className={cn(
															"rounded-lg text-sm px-3 py-2 h-9 w-full justify-start",
															isActive
																? "bg-primary hover:bg-primary dark:bg-blue-500 text-white dark:hover:bg-blue-500 hover:text-white"
																: "",
														)}
														onClick={() => switchTeam(team.id)}
													>
														<Users size={16} />
														<span>{team.name}</span>
													</SidebarMenuButton>
												</SidebarMenuItem>
											);
										})}
									</SidebarMenu>
								</SidebarGroup>
							)}
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
