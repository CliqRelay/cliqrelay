import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Settings } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveOrgCookie } from "@/lib/org-cookie";
import { clearActiveTeamCookie } from "@/lib/team-cookie";
import { useOrgStore } from "@/stores/org-store";
import { useTeamStore } from "@/stores/team-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OrgDropdown() {
	const orgId = useOrgStore((state) => state.orgId);
	const orgName = useOrgStore((state) => state.orgName);
	const organizations = useOrgStore((state) => state.organizations);
	const setOrg = useOrgStore((state) => state.setOrg);
	const setTeams = useTeamStore((state) => state.setTeams);
	const setActiveTeam = useTeamStore((state) => state.setActiveTeam);
	const navigate = useNavigate();

	const switchOrg = async (newOrgId: string, newOrgName: string) => {
		const org = organizations.find((o) => o.id === newOrgId);
		setActiveOrgCookie(newOrgId);
		setOrg(newOrgId, newOrgName, org?.ownerId ?? "");
		setTeams([]);
		setActiveTeam(null);
		clearActiveTeamCookie();
		navigate({ to: "/dashboard" });
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-8 gap-2 px-2 text-sm font-medium border border-sidebar-border/40 hover:border-sidebar-border hover:bg-accent/50 data-[state=open]:border-sidebar-border data-[state=open]:bg-accent/50 transition-all duration-200"
				>
					<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
						{orgName?.charAt(0)?.toUpperCase() ?? "?"}
					</div>
					<span className="hidden sm:inline max-w-28 truncate">
						{orgName ?? "Organization"}
					</span>
					<ChevronsUpDown
						size={14}
						className="shrink-0 text-muted-foreground/50"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="w-56 rounded-2xl data-open:slide-in-from-top-2 data-open:fade-in-0 data-closed:slide-out-to-top-2 data-closed:fade-out-0 duration-300"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
						Organizations
					</DropdownMenuLabel>
					{organizations.map((org) => {
						const isActive = org.id === orgId;
						return (
							<DropdownMenuItem
								key={org.id}
								className={cn(
									"mx-1 gap-2.5 px-3 py-2 text-sm font-medium cursor-pointer rounded-lg",
									isActive ? "bg-accent font-semibold" : "hover:bg-accent/50",
								)}
								onClick={() => switchOrg(org.id, org.name)}
							>
								<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
									{org.name?.charAt(0)?.toUpperCase() ?? "?"}
								</div>
								<span className="flex-1 truncate">{org.name}</span>
								{isActive && (
									<Check size={14} className="shrink-0 text-primary" />
								)}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="mx-1 gap-2.5 px-3 py-2 text-sm font-medium cursor-pointer rounded-lg hover:bg-accent/50"
					onClick={() =>
						navigate({
							to: "/dashboard/organizations/$orgId/settings",
							params: { orgId: orgId ?? "" },
						})
					}
				>
					<Settings size={16} className="shrink-0 text-muted-foreground" />
					<span>Settings</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
