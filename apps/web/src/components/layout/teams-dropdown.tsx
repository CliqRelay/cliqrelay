import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Plus, Settings, Users } from "lucide-react";

import { AppUserRole } from "@repo/data-commons";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveTeamCookie } from "@/lib/team-cookie";
import { cn } from "@/lib/utils";
import { useOrgStore, useTeamStore } from "@/stores";
import { CreateTeamDialogSlot } from "./create-team-dialog-slot";
import { RoleGuard } from "../shared/role-guard";

type Props = {
	collapsed?: boolean;
};

export function TeamsDropdown({ collapsed }: Props) {
	const navigate = useNavigate();

	const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);

	const teams = useTeamStore((state) => state.teams);
	const activeTeamId = useTeamStore((state) => state.activeTeamId);
	const setActiveTeam = useTeamStore((state) => state.setActiveTeam);
	const orgId = useOrgStore((state) => state.orgId);
	const orgTeams = teams.filter((team) => team.organizationId === orgId);
	const activeTeam = orgTeams.find((t) => t.id === activeTeamId);

	if (orgTeams.length === 0) {
		return null;
	}

	const switchTeam = (teamId: string) => {
		setActiveTeamCookie(teamId);
		setActiveTeam(teamId);
		navigate({ to: "/dashboard" });
	};

	const initial = activeTeam?.name?.charAt(0)?.toUpperCase() ?? "?";

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					{collapsed ? (
						<Button
							variant="ghost"
							className="flex size-9 items-center justify-center rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent transition-all duration-200"
							aria-label={activeTeam?.name ?? "Select Team"}
						>
							<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
								{initial}
							</div>
						</Button>
					) : (
						<Button
							variant="ghost"
							className="rounded-lg text-sm px-3 py-2 h-10 w-full justify-start border border-sidebar-border hover:border-sidebar-border hover:bg-sidebar-accent/50 data-[state=open]:border-sidebar-border data-[state=open]:bg-sidebar-accent transition-all duration-200 gap-2.5"
						>
							<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
								{initial}
							</div>
							<span className="flex-1 truncate text-left text-sm font-medium">
								{activeTeam?.name ?? "Select Team"}
							</span>
							<ChevronsUpDown
								size={14}
								className="shrink-0 text-muted-foreground/50"
							/>
						</Button>
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					side="right"
					sideOffset={12}
					className="w-56 rounded-2xl data-open:slide-in-from-left-4 data-open:fade-in-0 data-closed:slide-out-to-left-4 data-closed:fade-out-0 duration-300"
				>
					<DropdownMenuGroup>
						<DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Switch Team
						</DropdownMenuLabel>
						{orgTeams.map((team) => {
							const isActive = team.id === activeTeamId;
							return (
								<DropdownMenuItem
									key={team.id}
									className={cn(
										"mx-1 gap-2 px-3 py-2 text-sm font-medium cursor-pointer rounded-lg",
										isActive ? "bg-accent font-semibold" : "hover:bg-accent/50",
									)}
									onClick={() => switchTeam(team.id)}
								>
									<Users size={16} className="shrink-0 text-muted-foreground" />
									<span className="flex-1 truncate">{team.name}</span>
									{isActive && (
										<Check size={14} className="shrink-0 text-primary" />
									)}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuGroup>
					<RoleGuard minRole={AppUserRole.EDITOR}>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="mx-1 gap-2 px-3 py-2 text-sm font-medium cursor-pointer rounded-lg hover:bg-accent/50"
							onClick={() => setCreateDialogOpen(true)}
						>
							<Plus size={16} className="shrink-0 text-muted-foreground" />
							<span>Create Team</span>
						</DropdownMenuItem>
					</RoleGuard>
					<RoleGuard minRole={AppUserRole.ADMIN}>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="mx-1 gap-2 px-3 py-2 text-sm font-medium cursor-pointer rounded-lg hover:bg-accent/50"
							onClick={() => {
								const targetTeamId = activeTeam?.id ?? orgTeams[0]?.id;
								if (!targetTeamId || !orgId) {
									return;
								}
								navigate({
									to: "/dashboard/organizations/$orgId/teams/$teamId/settings/general",
									params: { orgId, teamId: targetTeamId },
								});
							}}
						>
							<Settings size={16} className="shrink-0 text-muted-foreground" />
							<span>Settings</span>
						</DropdownMenuItem>
					</RoleGuard>
				</DropdownMenuContent>
			</DropdownMenu>
			<CreateTeamDialogSlot
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
			/>
		</>
	);
}
