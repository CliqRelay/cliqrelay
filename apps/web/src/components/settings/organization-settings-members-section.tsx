import { useCallback, useEffect, useState } from "react";

import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrganizationMemberResponse } from "authula";

import { InviteMemberDialog } from "./invite-member-dialog";
import { ManageMemberTeamsSheet } from "./manage-member-teams-sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";
import { useUserStore } from "@/stores/user-store";

type MemberProfile = {
	memberId: string;
	userId: string;
	role: string;
	name: string;
	email: string;
	createdAt: string;
	image?: string | null;
};

export function OrganizationSettingsMembersSection() {
	const orgId = useOrgStore((state) => state.orgId);
	const orgOwnerId = useOrgStore((state) => state.orgOwnerId);
	const currentUserId = useUserStore((state) => state.userId);
	const setCurrentMember = useOrgStore((state) => state.setCurrentMember);

	const [members, setMembers] = useState<MemberProfile[]>([]);
	const [invitations, setInvitations] = useState<
		Array<{ id: string; email: string; role: string; status: string }>
	>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [inviteDialogOpen, setInviteDialogOpen] = useState<boolean>(false);

	const currentMember = useOrgStore((state) => state.currentMember);
	const canRemoveMembers = currentMember?.role === "admin";

	const [manageTeamsSheetOpen, setManageTeamsSheetOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

	const canManageTeams = (member: MemberProfile) =>
		canRemoveMembers && member.userId !== currentUserId && member.userId !== orgOwnerId;

	const loadData = useCallback(async () => {
		try {
			if (!orgId) {
				return;
			}

			const [orgMembersRes, invitationsRes] = await Promise.all([
				authulaClient.organizations.listOrganizationMembers(orgId),
				authulaClient.organizations.listOrganizationInvitations(orgId),
			]);

			const rawMembers = orgMembersRes as OrganizationMemberResponse[];
			const members: MemberProfile[] = rawMembers
				.map((m) => ({
					memberId: m.id,
					userId: m.user.id,
					role: m.role,
					createdAt: m.createdAt,
					name: m.user?.name ?? "Unknown",
					email: m.user?.email ?? "",
					image: m.user?.image,
				}))
				.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

			const currentUserMember = rawMembers.find(
				(m) => m.user.id === currentUserId,
			);
			if (currentUserMember) {
				setCurrentMember(currentUserMember);
			}

			setMembers(members);
			setInvitations(
				(invitationsRes ?? []).map((res) => ({
					id: res.invitation.id,
					email: res.invitation.email,
					role: res.invitation.role,
					status: res.invitation.status,
				})),
			);
		} catch (error) {
			toast.error("Failed to load members");
		} finally {
			setLoading(false);
		}
	}, [orgId, currentUserId]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleRemoveMember = async (memberId: string) => {
		if (!orgId) return;
		try {
			await authulaClient.organizations.deleteOrganizationMember(
				orgId,
				memberId,
			);
			toast.success("Member removed");
			loadData();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to remove member",
			);
		}
	};

	const handleRevokeInvitation = async (invitationId: string) => {
		if (!orgId) return;
		try {
			await authulaClient.organizations.revokeOrganizationInvitation(
				orgId,
				invitationId,
			);
			toast.success("Invitation revoked");
			loadData();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to revoke invitation",
			);
		}
	};

	if (loading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Members</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage who has access to your organization
					</p>
				</div>
				{[...Array(3)].map((_, i) => (
					<div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
				))}
			</div>
		);
	}

	const roleBadgeVariant = (role: string) => {
		switch (role) {
			case "admin":
				return "default" as const;
			case "editor":
				return "secondary" as const;
			default:
				return "outline" as const;
		}
	};

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Members</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage who has access to your organization
					</p>
				</div>
				<Button onClick={() => setInviteDialogOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Invite Member
				</Button>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Current Members</CardTitle>
					<CardDescription>
						{members.length} member{members.length !== 1 ? "s" : ""} in your
						organization
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="pl-6">Member</TableHead>
								<TableHead>Role</TableHead>
								<TableHead className="w-20" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((member) => (
								<TableRow
									key={member.memberId}
									className={cn(
										canManageTeams(member) &&
											"cursor-pointer hover:bg-muted/50",
									)}
									onClick={() => {
										if (canManageTeams(member)) {
											setSelectedMember(member);
											setManageTeamsSheetOpen(true);
										}
									}}
								>
									<TableCell className="pl-6">
										<div className="flex items-center gap-3">
											<Avatar className="size-8">
												<AvatarFallback className="text-xs bg-muted">
													{member.name.charAt(0)?.toUpperCase() ?? "?"}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-col">
												<span className="text-sm font-medium">
													{member.name}
												</span>
												<span className="text-xs text-muted-foreground">
													{member.email}
												</span>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant={roleBadgeVariant(member.role)}
											className="capitalize"
										>
											{member.role}
										</Badge>
									</TableCell>
									<TableCell>
										{canRemoveMembers ? (
											<Button
												variant="ghost"
												size="icon"
												className="size-8 text-muted-foreground hover:text-destructive"
												disabled={
													member.userId === orgOwnerId ||
													member.userId === currentUserId
												}
												onClick={(e) => {
													e.stopPropagation();
													handleRemoveMember(member.memberId);
												}}
											>
												<Trash2 size={14} />
											</Button>
										) : (
											<div className="size-8" />
										)}
									</TableCell>
								</TableRow>
							))}
							{members.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={3}
										className="h-24 text-center text-muted-foreground"
									>
										No members yet
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{invitations.filter((inv) => inv.status === "pending").length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Pending Invitations</CardTitle>
						<CardDescription>
							Invitations that have been sent but not yet accepted
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="pl-6">Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
							<TableHead className="w-20" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{invitations
									.filter((inv) => inv.status === "pending")
									.map((inv) => (
										<TableRow key={inv.id}>
											<TableCell className="pl-6">
												<div className="flex items-center gap-3">
													<div className="flex size-8 items-center justify-center rounded-full bg-muted">
														<Mail size={14} className="text-muted-foreground" />
													</div>
													<span className="text-sm">{inv.email}</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className="capitalize">
													{inv.role}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant="secondary" className="capitalize">
													{inv.status}
												</Badge>
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													className="size-8 text-muted-foreground hover:text-destructive"
													onClick={() => handleRevokeInvitation(inv.id)}
												>
													<Trash2 size={14} />
												</Button>
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			<InviteMemberDialog
				open={inviteDialogOpen}
				onOpenChange={setInviteDialogOpen}
				onInvited={() => loadData()}
			/>

			<ManageMemberTeamsSheet
				open={manageTeamsSheetOpen}
				onOpenChange={(open) => {
					setManageTeamsSheetOpen(open);
					if (!open) setSelectedMember(null);
				}}
				member={selectedMember}
				orgId={orgId ?? ""}
				onSuccess={() => loadData()}
			/>
		</div>
	);
}
