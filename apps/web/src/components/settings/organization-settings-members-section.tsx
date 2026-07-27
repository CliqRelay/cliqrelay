import { useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MemberProfile } from "@/models/members";
import { useOrgStore } from "@/stores/org-store";
import { useUserStore } from "@/stores/user-store";
import { InviteMemberDialog } from "./members/invite-member-dialog";
import { ManageMemberTeamsSheet } from "./members/manage-member-teams-sheet";
import { MembersTable } from "./members/members-table";
import { PendingInvitations } from "./members/pending-invitations";
import { useMembersData } from "./members/use-members-data";

export function OrganizationSettingsMembersSection() {
	const orgId = useOrgStore((state) => state.orgId);
	const orgOwnerId = useOrgStore((state) => state.orgOwnerId);
	const currentUserId = useUserStore((state) => state.userId);
	const currentMember = useOrgStore((state) => state.currentMember);

	const {
		members,
		invitations,
		loading,
		handleRemoveMember,
		handleRevokeInvitation,
		refetch,
	} = useMembersData();

	const canRemoveMembers = currentMember?.role === "admin";
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
	const [manageTeamsSheetOpen, setManageTeamsSheetOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(
		null,
	);

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

			<MembersTable
				members={members}
				canRemoveMembers={canRemoveMembers}
				orgOwnerId={orgOwnerId ?? ""}
				currentUserId={currentUserId ?? ""}
				onRemoveMember={handleRemoveMember}
				onManageTeams={(member) => {
					setSelectedMember(member);
					setManageTeamsSheetOpen(true);
				}}
			/>

			<PendingInvitations
				invitations={invitations}
				onRevokeInvitation={handleRevokeInvitation}
			/>

			<InviteMemberDialog
				open={inviteDialogOpen}
				onOpenChange={setInviteDialogOpen}
				onInvited={() => refetch()}
			/>

			<ManageMemberTeamsSheet
				open={manageTeamsSheetOpen}
				onOpenChange={(open) => {
					setManageTeamsSheetOpen(open);
					if (!open) setSelectedMember(null);
				}}
				member={selectedMember}
				orgId={orgId ?? ""}
				onSuccess={() => refetch()}
			/>
		</div>
	);
}
