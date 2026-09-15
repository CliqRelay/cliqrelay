import { type ReactNode, useState, useSyncExternalStore } from "react";

import { useRouterState } from "@tanstack/react-router";

import { AppSidebar, SidebarContent } from "./app-sidebar";
import { TopBar } from "./top-bar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LOCAL_STORAGE_SIDEBAR_KEY } from "@/constants/local-storage";
import type { AppUser } from "@/models/auth";

function getSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

const sidebarListeners = new Set<() => void>();

function subscribeSidebarCollapsed(listener: () => void) {
  sidebarListeners.add(listener);
  return () => sidebarListeners.delete(listener);
}

function setSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SIDEBAR_KEY, String(collapsed));
  } catch {
    // localStorage unavailable
  }
  for (const listener of sidebarListeners) {
    listener();
  }
}

export function DashboardShell({ children, user }: { children: ReactNode; user?: AppUser | null }) {
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsed,
    () => false,
  );

  const hideTopBar = useRouterState({
    select: (state) => state.matches.some((m) => !!m.context?.hideSiteHeader),
  });

  const toggleCollapse = () => setSidebarCollapsed(!collapsed);

  return (
    <div className="flex min-h-screen bg-[url(/dashboard-light-bg.png)] bg-cover bg-fixed bg-center bg-no-repeat text-foreground dark:bg-[linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)),url(/dashboard-dark-bg.png)]">
      <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className="flex min-w-0 flex-1 flex-col">
        {!hideTopBar && <TopBar onMenuToggle={() => setSheetOpen(true)} user={user} />}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-62 border-0 bg-sidebar p-0">
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
