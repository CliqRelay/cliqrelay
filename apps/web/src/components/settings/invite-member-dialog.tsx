import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";
import { envClient } from "@/constants/env-client";

const inviteSchema = z.object({
	email: z.email("Invalid email address"),
	role: z.enum(["admin", "editor", "viewer"]),
});

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInvited?: () => void;
};

export function InviteMemberDialog({ open, onOpenChange, onInvited }: Props) {
	const orgId = useOrgStore((state) => state.orgId);

	const form = useForm({
		validators: { onSubmit: inviteSchema },
		defaultValues: {
			email: "",
			role: "viewer",
		},
		onSubmit: async ({ value }) => {
			try {
				if (!orgId) {
					toast.error("No organization selected");
					return;
				}

				await authulaClient.organizations.createOrganizationInvitation(
					orgId,
					{
						email: value.email,
						role: value.role,
					},
					{
						redirectUrl: `${envClient.baseUrl}/dashboard/organizations/invitation`,
					},
				);
				toast.success("Invitation sent");
				form.reset();
				onOpenChange(false);
				onInvited?.();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to send invitation",
				);
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite Member</DialogTitle>
					<DialogDescription>
						Send an invitation to join this organization
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<div className="space-y-4">
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="email">Email Address</Label>
									<Input
										id="email"
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="colleague@example.com"
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="role">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="role">Role</Label>
									<Select
										value={field.state.value}
										onValueChange={(value) => {
											field.handleChange(
												value as "admin" | "editor" | "viewer",
											);
										}}
									>
										<SelectTrigger id="role">
											<SelectValue placeholder="Select a role" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="editor">Editor</SelectItem>
											<SelectItem value="viewer">Viewer</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit">Send Invitation</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
