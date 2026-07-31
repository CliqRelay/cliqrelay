import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { OrganizationTeam } from "authula";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authulaClient } from "@/lib/authula-client";
import { toast } from "@/lib/toast";
import { useTeamStore } from "@/stores";

const formSchema = z.object({
	name: z.string().trim().min(1, "Team name is required"),
	slug: z.string().trim().optional(),
});
type FormSchema = z.infer<typeof formSchema>;

function FieldInfo({ field }: { field: any }) {
	if (!field.state.meta.isTouched || field.state.meta.errors.length === 0) {
		return null;
	}
	return (
		<p className="text-sm text-destructive mt-1">
			{field.state.meta.errors
				.map((e: any) => (typeof e === "string" ? e : (e.message ?? e)))
				.join(", ")}
		</p>
	);
}

type Props = {
	team: OrganizationTeam;
	orgId: string;
};

export function TeamSettingsGeneralSection({ team, orgId }: Props) {
	const queryClient = useQueryClient();
	const teams = useTeamStore((state) => state.teams);
	const setTeams = useTeamStore((state) => state.setTeams);

	const form = useForm({
		validators: {
			onChange: formSchema,
		},
		defaultValues: {
			name: team.name ?? "",
			slug: team.slug ?? "",
		} satisfies FormSchema,
		onSubmit: async ({ value }) => {
			try {
				const updated =
					await authulaClient.organizations.updateOrganizationTeam(
						orgId,
						team.id,
						{
							name: value.name,
							slug: value.slug || undefined,
						},
					);
				const newName = updated?.name ?? value.name;
				const newSlug = updated?.slug ?? value.slug;
				setTeams(
					teams.map((t) => (t.id === team.id ? { ...t, name: newName } : t)),
				);
				queryClient.invalidateQueries({
					queryKey: ["organization-team", orgId, team.id],
				});
				form.reset({ name: newName, slug: newSlug });
				toast.success("Team settings updated");
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to update team settings",
				);
			}
		},
	});

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">General</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Manage your team's basic settings
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Team Name</CardTitle>
					<CardDescription>
						This is the name displayed across your team
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<form
						className="flex flex-col gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						<div className="space-y-4">
							<form.Field
								name="name"
								children={(field) => (
									<div className="space-y-2">
										<Label htmlFor="team-name">Name</Label>
										<Input
											id="team-name"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											placeholder="My Team"
											className="w-full"
										/>
										<FieldInfo field={field} />
									</div>
								)}
							/>
							<form.Field
								name="slug"
								children={(field) => (
									<div className="space-y-2">
										<Label htmlFor="team-slug">Slug</Label>
										<Input
											id="team-slug"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											placeholder="my-team"
											className="w-full"
										/>
										<FieldInfo field={field} />
									</div>
								)}
							/>
							<form.Subscribe
								selector={(state) => ({
									values: state.values,
									isSubmitting: state.isSubmitting,
								})}
								children={({ values, isSubmitting }) => {
									const hasChanges =
										values.name !== form.options.defaultValues?.name ||
										values.slug !== form.options.defaultValues?.slug;
									return (
										<Button
											type="submit"
											disabled={!hasChanges || isSubmitting}
										>
											{isSubmitting ? "Saving..." : "Save"}
										</Button>
									);
								}}
							/>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
