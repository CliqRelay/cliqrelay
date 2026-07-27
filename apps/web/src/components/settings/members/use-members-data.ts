import { useCallback, useEffect, useState } from "react";

import type { OrganizationMemberResponse } from "authula";
import { toast } from "sonner";

import { authulaClient } from "@/lib/authula-client";
import type { MemberProfile } from "@/models/members";
import { useOrgStore } from "@/stores/org-store";
import { useUserStore } from "@/stores/user-store";

export function useMembersData() {
	const orgId = useOrgStore((state) => state.orgId);
	const currentUserId = useUserStore((state) => state.userId);
	const setCurrentMember = useOrgStore((state) => state.setCurrentMember);

	const [members, setMembers] = useState<MemberProfile[]>([]);
	const [invitations, setInvitations] = useState<
		Array<{ id: string; email: string; role: string; status: string }>
	>([]);
	const [loading, setLoading] = useState(true);

	const loadData = useCallback(async () => {
		try {
			if (!orgId) return;

			const [orgMembersRes, invitationsRes] = await Promise.all([
				authulaClient.organizations.listOrganizationMembers(orgId),
				authulaClient.organizations.listOrganizationInvitations(orgId),
			]);

			const rawMembers = orgMembersRes as OrganizationMemberResponse[];
			const mappedMembers: MemberProfile[] = rawMembers
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

			setMembers(mappedMembers);
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
	}, [orgId, currentUserId, setCurrentMember]);

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

	return {
		members,
		invitations,
		loading,
		handleRemoveMember,
		handleRevokeInvitation,
		refetch: loadData,
	};
}
