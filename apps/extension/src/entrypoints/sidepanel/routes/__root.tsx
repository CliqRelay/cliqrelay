import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";

import { Settings } from "lucide-react";

import { useAuthSession } from "../hooks/useAuthSession";
import { useSessionCookieSync } from "../hooks/useSessionCookieSync";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import "../styles.css";

export type SidePanelRouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<SidePanelRouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  useSessionCookieSync();
  const { isAuthenticated } = useAuthSession();

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <header className="flex shrink-0 items-center gap-3 border-b border-border/40 p-5">
          <img src="/app-icon-logo.svg" alt="CliqRelay Logo" className="h-6 w-auto" />
          {isAuthenticated && (
            <div className="ml-auto flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-xs" asChild>
                    <Link to="/settings">
                      <Settings className="size-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">
                  Settings
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </header>
        <Outlet />
      </div>
    </TooltipProvider>
  );
}
