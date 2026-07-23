import {
	createFileRoute,
	isRedirect,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { authulaClient } from "@/lib/authula-client";

export const Route = createFileRoute("/create-organization")({
	beforeLoad: async () => {
		try {
			const response = await authulaClient.core.getMe();

			if (!response.user.emailVerified) {
				throw redirect({ to: "/auth/email-verification" });
			}
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/auth/sign-in" });
		}

		try {
			const organizations =
				await authulaClient.organizations.listOrganizations();

			if (organizations && organizations.length > 0) {
				throw redirect({ to: "/dashboard" });
			}
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
		}
	},
	component: CreateOrganization,
});

const formSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Organization name is required")
		.max(255, "Organization name must be at most 255 characters"),
});
type FormSchema = z.infer<typeof formSchema>;

function CreateOrganization() {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: {
			name: "",
		} as FormSchema,
		validators: {
			onChange: formSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await authulaClient.organizations.createOrganization({
					name: value.name,
					role: "admin",
				});

				toast({
					title: "Success",
					description: "Your organization has been created.",
				});

				navigate({ to: "/dashboard" });
			} catch (error: any) {
				toast({
					title: "Failed to create organization",
					description: error?.message || "An unknown error occurred",
				});
			}
		},
	});

	return (
		<div className="w-full h-full p-4 grid place-items-center">
			<div className="w-full flex flex-col justify-center items-center gap-10">
				<img
					src="/app-logo-dark.png"
					alt="App Logo"
					className="h-16 w-max block dark:hidden"
				/>
				<img
					src="/app-logo-light.png"
					alt="App Logo"
					className="h-16 w-max hidden dark:block"
				/>
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl font-bold">
							Create Your Organization
						</CardTitle>
						<CardDescription>
							Choose a name for your organization to get started.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								form.handleSubmit();
							}}
						>
							<div className="flex flex-col gap-2">
								<form.Field
									name="name"
									validators={{ onChange: formSchema.shape.name }}
								>
									{(field) => (
										<Field data-invalid={field.state.meta.errors.length > 0}>
											<FieldLabel htmlFor={field.name}>
												Organization Name
											</FieldLabel>
											<Input
												id={field.name}
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="My Organization"
											/>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>

								<form.Subscribe
									selector={(state) => [state.canSubmit, state.isSubmitting]}
								>
									{([canSubmit, isSubmitting]) => (
										<Button
											type="submit"
											className="w-full mt-4"
											disabled={!canSubmit}
										>
											{isSubmitting ? "Creating..." : "Create Organization"}
										</Button>
									)}
								</form.Subscribe>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
