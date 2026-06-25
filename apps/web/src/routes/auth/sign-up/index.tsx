import { useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from "lucide-react";
import type { Session, User } from "authula";

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
import { envClient } from "@/constants/env-client";

export const Route = createFileRoute("/auth/sign-up/")({
	component: SignupPage,
});

const signUpSchema = z
	.object({
		name: z.string().nonempty("Name is required"),
		email: z.email("Please enter a valid email address"),
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

type SignUpFormData = z.infer<typeof signUpSchema>;

function SignupPage() {
	const navigate = useNavigate();

	const [showPassword, setShowPassword] = useState<boolean>(false);
	const [showConfirmPassword, setShowConfirmPassword] =
		useState<boolean>(false);

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		} as SignUpFormData,
		validators: {
			onChange: signUpSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await authulaClient.emailPassword.signUp<{
					user: User;
					session: Session;
				}>({
					name: value.name,
					email: value.email,
					password: value.password,
					callbackUrl: `${envClient.baseUrl}/dashboard`,
				});

				localStorage.setItem("email", value.email);

				toast({
					title: "Success",
					description: "Signed up successfully.",
				});

				navigate({ to: "/dashboard" });
			} catch (error: any) {
				toast({
					title: "Sign up failed",
					description: error?.message || "An unknown error occurred",
				});
			}
		},
	});

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
				<CardDescription>Create your account to get started.</CardDescription>
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
						{/* NAME */}
						<form.Field
							name="name"
							validators={{ onChange: signUpSchema.shape.name }}
						>
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
									<div className="relative">
										<UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											id={field.name}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											className="pl-10"
										/>
									</div>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						{/* EMAIL */}
						<form.Field
							name="email"
							validators={{ onChange: signUpSchema.shape.email }}
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

						{/* PASSWORD */}
						<form.Field
							name="password"
							validators={{ onChange: signUpSchema.shape.password }}
						>
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor={field.name}>Password</FieldLabel>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											id={field.name}
											type={showPassword ? "text" : "password"}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											className="pl-10 pr-10"
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

						{/* CONFIRM PASSWORD */}
						<form.Field name="confirmPassword">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											id={field.name}
											type={showConfirmPassword ? "text" : "password"}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											className="pl-10 pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowConfirmPassword((p) => !p)}
											className="absolute right-3 top-1/2 -translate-y-1/2"
										>
											{showConfirmPassword ? (
												<EyeOff size={16} />
											) : (
												<Eye size={16} />
											)}
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
									{isSubmitting ? "Registering..." : "Sign Up"}
								</Button>
							)}
						</form.Subscribe>

						<div className="mt-4 text-center text-sm">
							Already have an account?{" "}
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
