import { Mail, Trash2 } from "lucide-react";

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

type Invitation = {
	id: string;
	email: string;
	role: string;
	status: string;
};

type Props = {
	invitations: Invitation[];
	onRevokeInvitation: (invitationId: string) => void;
};

export function PendingInvitations({ invitations, onRevokeInvitation }: Props) {
	const pending = invitations.filter((inv) => inv.status === "pending");

	if (pending.length === 0) return null;

	return (
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
						{pending.map((inv) => (
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
										onClick={() => onRevokeInvitation(inv.id)}
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
	);
}
