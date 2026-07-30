import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import {
	createFileRoute,
	Link,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { envClient } from "@/constants/env-client";
import { authulaClient } from "@/lib/authula-client";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/auth/reset-password")({
	component: ResetPasswordPage,
});

const requestPasswordResetSchema = z.object({
	email: z.email("Please enter a valid email address"),
});

type RequestResetFormData = z.infer<typeof requestPasswordResetSchema>;

function ResetPasswordPage() {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: {
			email: "",
		} as RequestResetFormData,
		validators: {
			onChange: requestPasswordResetSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await authulaClient.emailPassword.requestPasswordReset({
					email: value.email,
					callbackUrl: `${envClient.baseUrl}/auth/change-password`,
				});

				toast("Email sent", {
					description:
						"If an account exists with that email, you will receive a password reset link.",
				});

				navigate({ to: "/auth/sign-in" });
			} catch (error: any) {
				toast("Request failed", {
					description: error?.message || "An unknown error occurred",
				});
			}
		},
	});

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
				<CardDescription>
					Enter your email and we'll send you a reset link.
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
						{/* EMAIL */}
						<form.Field
							name="email"
							validators={{ onChange: requestPasswordResetSchema.shape.email }}
						>
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor={field.name}>Email</FieldLabel>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											id={field.name}
											type="email"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											className="pl-10"
										/>
									</div>
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
									{isSubmitting ? "Sending..." : "Send Reset Link"}
								</Button>
							)}
						</form.Subscribe>

						<div className="mt-4 text-center text-sm">
							Remember your password?{" "}
							<Link
								to="/auth/sign-in"
								className="text-blue-500 hover:underline"
							>
								Sign In
							</Link>
						</div>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
