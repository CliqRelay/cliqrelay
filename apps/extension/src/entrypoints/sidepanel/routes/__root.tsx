import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import "../styles.css";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	return (
		<TooltipProvider>
			<div className="flex h-screen w-full flex-col bg-background">
				<header className="flex shrink-0 items-center gap-3 border-b border-border/40 p-5">
					<img
						src="/app-icon-logo.svg"
						alt="CliqRelay Logo"
						className="h-6 w-auto"
					/>
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
				</header>
				<Outlet />
			</div>
		</TooltipProvider>
	);
}
