import { useCallback, useEffect, useState } from "react";

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { InviteMemberDialog } from "@/components/settings/invite-member-dialog";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";

type MemberWithUser = {
	memberId: string;
	userId: string;
	role: string;
	name?: string;
	email?: string;
	image?: string | null;
};

export const Route = createFileRoute("/dashboard/settings/$teamId")({
	component: TeamSettingsPage,
});

function TeamSettingsPage() {
	const { teamId } = Route.useParams();
	const orgId = useOrgStore((state) => state.orgId);
	const router = useRouter();
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

	const [orgMembers, setOrgMembers] = useState<MemberWithUser[]>([]);
	const [teamMembers, setTeamMembers] = useState<MemberWithUser[]>([]);
	const [loading, setLoading] = useState(true);

	const loadData = useCallback(async () => {
		if (!orgId) return;

		try {
			const [orgMembersRes, teamMembersRes] = await Promise.all([
				authulaClient.organizations.listOrganizationMembers(orgId),
				authulaClient.organizations.listOrganizationTeamMembers(orgId, teamId),
			]);

			const userIds = new Set<string>();
			orgMembersRes.forEach((m: { userId: string }) => userIds.add(m.userId));
			teamMembersRes.forEach((m: { memberId: string }) => {
				const member = orgMembersRes.find(
					(om: { id: string }) => om.id === m.memberId,
				);
				if (member) userIds.add(member.userId);
			});

			const userProfiles = new Map<string, { name: string; email: string; image?: string | null }>();
			for (const userId of userIds) {
				try {
					const res = await authulaClient.admin.getUser(userId);
					userProfiles.set(userId, res.user);
				} catch {
					userProfiles.set(userId, { name: "Unknown", email: "" });
				}
			}

			const enrichedOrgMembers: MemberWithUser[] = orgMembersRes.map(
				(m: { id: string; userId: string; role: string }) => {
					const profile = userProfiles.get(m.userId);
					return {
						memberId: m.id,
						userId: m.userId,
						role: m.role,
						name: profile?.name,
						email: profile?.email,
						image: profile?.image,
					};
				},
			);

			const teamMemberIds = new Set(
				teamMembersRes.map((m: { memberId: string }) => m.memberId),
			);
			const enrichedTeamMembers: MemberWithUser[] = enrichedOrgMembers.filter(
				(m) => teamMemberIds.has(m.memberId),
			);

			setOrgMembers(enrichedOrgMembers);
			setTeamMembers(enrichedTeamMembers);
		} catch (error) {
			toast.error("Failed to load members");
		} finally {
			setLoading(false);
		}
	}, [orgId, teamId]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const availableOrgMembers = orgMembers.filter(
		(om) => !teamMembers.some((tm) => tm.memberId === om.memberId),
	);

	const handleAddMember = async (memberId: string) => {
		if (!orgId) return;
		try {
			await authulaClient.organizations.addOrganizationTeamMember(orgId, teamId, {
				memberId,
			});
			toast.success("Member added to team");
			loadData();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to add member",
			);
		}
	};

	const handleRemoveMember = async (memberId: string) => {
		if (!orgId) return;
		try {
			await authulaClient.organizations.deleteOrganizationTeamMember(
				orgId,
				teamId,
				memberId,
			);
			toast.success("Member removed from team");
			loadData();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to remove member",
			);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold tracking-tight">Team Members</h2>
					<p className="text-sm text-muted-foreground">
						Manage members assigned to this team
					</p>
				</div>
				<Button onClick={() => setInviteDialogOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Invite Member
				</Button>
			</div>

			<div className="space-y-4">
				<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Current Team Members ({teamMembers.length})
				</h3>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead className="w-20" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{teamMembers.length === 0 && (
							<TableRow>
								<TableCell colSpan={4} className="text-center text-muted-foreground">
									No members in this team
								</TableCell>
							</TableRow>
						)}
						{teamMembers.map((member) => (
							<TableRow key={member.memberId}>
								<TableCell className="font-medium">{member.name ?? "—"}</TableCell>
								<TableCell>{member.email ?? "—"}</TableCell>
								<TableCell className="capitalize">{member.role}</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleRemoveMember(member.memberId)}
									>
										<Trash2 className="h-4 w-4 text-destructive" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="space-y-4">
				<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Available Org Members ({availableOrgMembers.length})
				</h3>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead className="w-20" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{availableOrgMembers.length === 0 && (
							<TableRow>
								<TableCell colSpan={4} className="text-center text-muted-foreground">
									No available members
								</TableCell>
							</TableRow>
						)}
						{availableOrgMembers.map((member) => (
							<TableRow key={member.memberId}>
								<TableCell className="font-medium">{member.name ?? "—"}</TableCell>
								<TableCell>{member.email ?? "—"}</TableCell>
								<TableCell className="capitalize">{member.role}</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleAddMember(member.memberId)}
									>
										<Plus className="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<InviteMemberDialog
				open={inviteDialogOpen}
				onOpenChange={setInviteDialogOpen}
				onInvited={() => loadData()}
			/>
		</div>
	);
}
