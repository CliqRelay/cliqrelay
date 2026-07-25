import type { PropsWithChildren } from "react";

import { Link, useParams } from "@tanstack/react-router";
import { Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type SettingsLayoutProps = {
	teams: Array<{ id: string; name: string }>;
};

export function SettingsLayout({
	teams,
	children,
}: PropsWithChildren<SettingsLayoutProps>) {
	const { teamId } = useParams({ strict: false });

	return (
		<div className="flex h-full">
			<div className="w-64 shrink-0 border-r bg-background">
				<div className="flex h-12 items-center gap-2 border-b px-4">
					<Settings size={16} />
					<span className="text-sm font-semibold">Settings</span>
				</div>
				<ScrollArea className="h-[calc(100%-3rem)]">
					<div className="p-2">
						<p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
							Teams
						</p>
						<div className="mt-1 space-y-0.5">
							{teams.map((team) => {
								const isActive = team.id === teamId;
								return (
									<Button
										key={team.id}
										variant="ghost"
										asChild
										className={cn(
											"w-full justify-start gap-2 px-3 text-sm font-normal",
											isActive && "bg-accent font-medium",
										)}
									>
										<Link
											to="/dashboard/settings/$teamId"
											params={{ teamId: team.id }}
										>
											<Users size={14} />
											{team.name}
										</Link>
									</Button>
								);
							})}
						</div>
					</div>
				</ScrollArea>
			</div>
			<div className="flex-1">{children}</div>
		</div>
	);
}
