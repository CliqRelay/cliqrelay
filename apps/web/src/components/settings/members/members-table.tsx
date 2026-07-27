import { Trash2 } from "lucide-react";

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
import type { MemberProfile } from "@/models/members";

type Props = {
	members: MemberProfile[];
	canRemoveMembers: boolean;
	orgOwnerId: string;
	currentUserId: string;
	onRemoveMember: (memberId: string) => void;
	onManageTeams: (member: MemberProfile) => void;
};

function roleBadgeVariant(role: string) {
	switch (role) {
		case "admin":
			return "default" as const;
		case "editor":
			return "secondary" as const;
		default:
			return "outline" as const;
	}
}

export function MembersTable({
	members,
	canRemoveMembers,
	orgOwnerId,
	currentUserId,
	onRemoveMember,
	onManageTeams,
}: Props) {
	const canManageTeams = (member: MemberProfile) =>
		canRemoveMembers &&
		member.userId !== currentUserId &&
		member.userId !== orgOwnerId;

	return (
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
									canManageTeams(member) && "cursor-pointer hover:bg-muted/50",
								)}
								onClick={() => {
									if (canManageTeams(member)) {
										onManageTeams(member);
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
											<span className="text-sm font-medium">{member.name}</span>
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
												onRemoveMember(member.memberId);
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
	);
}
