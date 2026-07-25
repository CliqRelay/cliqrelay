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
import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";
import { useTeamStore } from "@/stores/team-store";
import { getTeams } from "@/server-fns/teams";

const createTeamSchema = z.object({
	name: z.string().min(1, "Team name is required").max(64, "Team name is too long"),
});

type CreateTeamDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
	const orgId = useOrgStore((state) => state.orgId);
	const setTeams = useTeamStore((state) => state.setTeams);

	const form = useForm({
		validators: { onSubmit: createTeamSchema },
		defaultValues: { name: "" },
		onSubmit: async ({ value }) => {
			if (!orgId) {
				toast.error("No organization selected");
				return;
			}
			try {
				await authulaClient.organizations.createOrganizationTeam(orgId, {
					name: value.name,
				});
				toast.success("Team created");
				form.reset();
				onOpenChange(false);
				const response = await getTeams();
				setTeams(response.teams);
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to create team",
				);
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Team</DialogTitle>
					<DialogDescription>
						Create a new team within your organization
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
						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="name">Team Name</Label>
									<Input
										id="name"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Enter team name"
									/>
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
						<Button type="submit">Create Team</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
