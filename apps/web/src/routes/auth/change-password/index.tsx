import { useState } from "react";

import {
	createFileRoute,
	Link,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";

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

export const Route = createFileRoute("/auth/change-password/")({
	component: ChangePasswordPage,
	validateSearch: (search: Record<string, string | undefined>) => ({
		token: search.token,
	}),
});

const changePasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.regex(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
				"Password must contain at least one uppercase letter, one lowercase letter, and one number",
			),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

function ChangePasswordPage() {
	const { token } = useSearch({ from: Route.id });

	const navigate = useNavigate();

	const [showPassword, setShowPassword] = useState<boolean>(false);

	const form = useForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
		} as ChangePasswordFormData,
		validators: {
			onChange: changePasswordSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await authulaClient.emailPassword.changePassword({
					token: token!,
					password: value.password,
				});

				toast({
					title: "Success",
					description: "Your password has been changed successfully.",
				});

				navigate({ to: "/auth/sign-in" });
			} catch (error: any) {
				toast({
					title: "Change failed",
					description: error?.message || "An unknown error occurred",
				});
			}
		},
	});

	if (!token) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">Invalid Link</CardTitle>
					<CardDescription>
						This password change link is invalid or missing a token.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="mt-4 text-center text-sm">
						<Link
							to="/auth/sign-in"
							className="text-blue-500 hover:underline inline-flex items-center gap-2"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Sign In
						</Link>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl font-bold">Change Password</CardTitle>
				<CardDescription>Enter your new password below.</CardDescription>
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
						{/* NEW PASSWORD */}
						<form.Field
							name="password"
							validators={{ onChange: changePasswordSchema.shape.password }}
						>
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor={field.name}>New Password</FieldLabel>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											id={field.name}
											type={showPassword ? "text" : "password"}
											value={field.state.value}
											className="pl-10 pr-10"
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										<button
											type="button"
											onClick={() => setShowPassword((p) => !p)}
											className="absolute right-3 top-1/2 -translate-y-1/2"
										>
											{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						{/* CONFIRM NEW PASSWORD */}
						<form.Field name="confirmPassword">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor={field.name}>
										Confirm New Password
									</FieldLabel>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											id={field.name}
											type={showPassword ? "text" : "password"}
											value={field.state.value}
											className="pl-10 pr-10"
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										<button
											type="button"
											onClick={() => setShowPassword((p) => !p)}
											className="absolute right-3 top-1/2 -translate-y-1/2"
										>
											{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
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
									{isSubmitting ? "Changing..." : "Change Password"}
								</Button>
							)}
						</form.Subscribe>

						<div className="mt-4 text-center text-sm">
							<Link
								to="/auth/sign-in"
								className="text-blue-500 hover:underline"
							>
								Back to Sign In
							</Link>
						</div>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
