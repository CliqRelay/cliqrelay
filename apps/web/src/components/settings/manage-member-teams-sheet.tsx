import { useEffect, useMemo, useRef, useState } from "react";

import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@repo/api-client";
import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";
import { useUserStore } from "@/stores/user-store";
import { getCsrfTokenHeader } from "@/utils/http.utils";

type MemberProfile = {
	memberId: string;
	userId: string;
	role: string;
	name: string;
	email: string;
	createdAt: string;
	image?: string | null;
};

type ManageMemberTeamsSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	member: MemberProfile | null;
	orgId: string;
	onSuccess: () => void;
};

export function ManageMemberTeamsSheet({
	open,
	onOpenChange,
	member,
	orgId,
	onSuccess,
}: ManageMemberTeamsSheetProps) {
	const orgOwnerId = useOrgStore((state) => state.orgOwnerId);
	const currentUserId = useUserStore((state) => state.userId);
	const isOwner = currentUserId === orgOwnerId;
	const enabled = open && member !== null;

	const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
	const [search, setSearch] = useState("");
	const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
	const initialLoadDone = useRef(false);

	const {
		data: allOrgTeams,
		isLoading: orgTeamsLoading,
	} = authulaClient.organizations.useListOrganizationTeams(
		orgId,
		{
			query: { enabled: enabled && isOwner, staleTime: 0 },
		},
	);

	const {
		data: myTeamsResponse,
		isLoading: myTeamsLoading,
	} = api.teams.useGetTeams({
		query: { enabled: enabled && !isOwner, staleTime: 0 },
		request: { credentials: "include" },
	});

	const teams = useMemo(() => {
		if (isOwner) {
			return (allOrgTeams ?? []).map((t) => ({
				id: t.id,
				name: t.name,
			}));
		}
		return (myTeamsResponse?.teams ?? []).filter((t) => t.organizationId === orgId);
	}, [isOwner, allOrgTeams, myTeamsResponse, orgId]);

	const {
		data: membershipsRes,
		isLoading: membershipsLoading,
	} = api.teams.useGetTeamMemberships(
		member?.memberId ?? "",
		{ organization_id: orgId },
		{
			query: { enabled, staleTime: 0 },
			request: { credentials: "include" },
		},
	);

	const initTeamIds = useMemo(() => {
		if (!membershipsRes) return null;
		return new Set(membershipsRes.teamIds ?? []);
	}, [membershipsRes]);

	const isLoading = enabled && (membershipsLoading || orgTeamsLoading || myTeamsLoading);

	useEffect(() => {
		initialLoadDone.current = false;
		setSelectedTeamIds(new Set());
		setSearch("");
	}, [member?.memberId]);

	useEffect(() => {
		if (initTeamIds && !initialLoadDone.current) {
			setSelectedTeamIds(initTeamIds);
			initialLoadDone.current = true;
		}
	}, [initTeamIds]);

	const { mutate: saveMemberships, isPending: saving } =
		api.teams.useUpdateTeamMemberships({
			request: {
				credentials: "include",
				headers: {
					...getCsrfTokenHeader(),
				},
			},
		});

	const hasChanges =
		initTeamIds !== null &&
		(initTeamIds.size !== selectedTeamIds.size ||
			!Array.from(initTeamIds).every((id) => selectedTeamIds.has(id)));

	const filteredTeams = useMemo(() => {
		if (!search) return teams;
		const q = search.toLowerCase();
		return teams.filter(
			(t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
		);
	}, [teams, search]);

	const handleSave = () => {
		if (!member) return;

		saveMemberships(
			{
				memberId: member.memberId,
				data: {
					organizationId: orgId,
					teamIds: Array.from(selectedTeamIds),
				},
			},
			{
				onSuccess: () => {
					toast.success("Team memberships updated");
					onSuccess();
					onOpenChange(false);
				},
				onError: (error) => {
					toast.error(
						error instanceof Error
							? error.message
							: "Failed to update team memberships",
					);
				},
			},
		);
	};

	const handleClearTeams = () => {
		setSelectedTeamIds(new Set());
	};

	const toggleTeam = (teamId: string) => {
		setSelectedTeamIds((prev) => {
			const next = new Set(prev);
			if (next.has(teamId)) {
				next.delete(teamId);
			} else {
				next.add(teamId);
			}
			return next;
		});
	};

	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			setSelectedTeamIds(new Set());
			setSearch("");
			initialLoadDone.current = false;
		}
	};

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-md flex flex-col gap-0 p-0"
			>
				<SheetHeader className="p-4 border-b shrink-0">
					<div className="flex items-center gap-3">
						<Avatar className="size-10">
							<AvatarFallback className="bg-muted text-sm">
								{member?.name?.charAt(0)?.toUpperCase() ?? "?"}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col min-w-0">
							<SheetTitle className="text-base truncate">
								{member?.name ?? "Unknown"}
							</SheetTitle>
							<SheetDescription className="truncate">
								{member?.email ?? ""}
							</SheetDescription>
						</div>
					</div>
					<p className="text-xs text-muted-foreground mt-2">
						Manage which teams this member belongs to
					</p>
				</SheetHeader>

				{isLoading ? (
					<div className="flex-1 p-4 space-y-3">
						{[...Array(5)].map((_, i) => (
							<div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
						))}
					</div>
				) : (
					<>
						<div className="p-4 pb-2 shrink-0">
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
								<Input
									placeholder="Search teams..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-8"
								/>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto px-4 pb-4">
							<div className="flex items-center justify-between mb-3">
								<p className="text-xs text-muted-foreground">
									{selectedTeamIds.size} of {teams.length} teams
								</p>
								{selectedTeamIds.size > 0 && (
									<button
										type="button"
										onClick={() => setClearConfirmOpen(true)}
										className="text-xs text-muted-foreground hover:text-destructive transition-colors"
									>
										Remove from all teams
									</button>
								)}
							</div>

							{filteredTeams.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									{search ? "No teams match your search" : "No teams available"}
								</p>
							) : (
								<div className="space-y-1">
									{filteredTeams.map((team) => {
										const checked = selectedTeamIds.has(team.id);
										return (
											<label
												key={team.id}
												className="flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
											>
												<Checkbox
													checked={checked}
													onCheckedChange={() => toggleTeam(team.id)}
												/>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">
														{team.name}
													</p>
													{checked && (
														<Badge
															variant="secondary"
															className="mt-0.5 text-[10px] px-1.5 py-0 h-4"
														>
															Selected
														</Badge>
													)}
												</div>
											</label>
										);
									})}
								</div>
							)}
						</div>
					</>
				)}

				<SheetFooter className="p-4 border-t shrink-0 flex-row gap-2">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						className="flex-1"
						disabled={saving}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						className="flex-1"
						disabled={saving || isLoading || !hasChanges}
					>
						{saving ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Saving...
							</>
						) : (
							"Save Changes"
						)}
					</Button>
				</SheetFooter>
			</SheetContent>

			<AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Remove from all teams?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove {member?.name ?? "this member"} from every team
							in this organization. They can be re-added later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								handleClearTeams();
								setClearConfirmOpen(false);
							}}
						>
							Remove
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Sheet>
	);
}
