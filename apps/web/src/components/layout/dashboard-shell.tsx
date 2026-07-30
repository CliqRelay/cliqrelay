import { type ReactNode, useCallback, useEffect, useState } from "react";

import { useRouterState } from "@tanstack/react-router";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LOCAL_STORAGE_SIDEBAR_KEY } from "@/constants/local-storage";
import type { AppUser } from "@/models/auth";
import { AppSidebar, SidebarContent } from "./app-sidebar";
import { TopBar } from "./top-bar";

function getSidebarCollapsed(): boolean {
	try {
		return localStorage.getItem(LOCAL_STORAGE_SIDEBAR_KEY) === "true";
	} catch {
		return false;
	}
}

function setSidebarCollapsed(collapsed: boolean) {
	try {
		localStorage.setItem(LOCAL_STORAGE_SIDEBAR_KEY, String(collapsed));
	} catch {
		// localStorage unavailable
	}
}

export function DashboardShell({
	children,
	user,
}: {
	children: ReactNode;
	user?: AppUser | null;
}) {
	const [sheetOpen, setSheetOpen] = useState<boolean>(false);
	const [collapsed, setCollapsed] = useState<boolean>(false);
	const [hydrated, setHydrated] = useState<boolean>(false);

	const hideTopBar = useRouterState({
		select: (state) => state.matches.some((m) => !!m.context?.hideSiteHeader),
	});

	useEffect(() => {
		setCollapsed(getSidebarCollapsed());
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (hydrated) {
			setSidebarCollapsed(collapsed);
		}
	}, [collapsed, hydrated]);

	const toggleCollapse = useCallback(() => setCollapsed((prev) => !prev), []);

	return (
		<div className="min-h-screen flex text-foreground bg-cover bg-center bg-no-repeat bg-fixed bg-[url(/dashboard-light-bg.png)] dark:bg-[linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url(/dashboard-dark-bg.png)]">
			<AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
			<div className="flex-1 min-w-0 flex flex-col">
				{!hideTopBar && (
					<TopBar onMenuToggle={() => setSheetOpen(true)} user={user} />
				)}
				<main className="flex-1 min-w-0">{children}</main>
			</div>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="left" className="w-62 p-0 border-0 bg-sidebar">
					<SheetTitle className="sr-only">Navigation</SheetTitle>
					<SidebarContent
						onNavigate={() => setSheetOpen(false)}
						collapsed={false}
						onToggleCollapse={() => {}}
						user={user}
					/>
				</SheetContent>
			</Sheet>
		</div>
	);
}
