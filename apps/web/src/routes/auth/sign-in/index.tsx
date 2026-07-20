import { useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
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

export const Route = createFileRoute("/auth/sign-in")({
	component: SignInPage,
});

const signInSchema = z.object({
	email: z.email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;

function SignInPage() {
	const navigate = useNavigate();

	const [showPassword, setShowPassword] = useState<boolean>(false);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		} as SignInFormData,
		validators: {
			onChange: signInSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await authulaClient.emailPassword.signIn(value);

				toast({
					title: "Success",
					description: "Signed in successfully.",
				});

				navigate({ to: "/dashboard" });
			} catch (error: any) {
				toast({
					title: "Sign in failed",
					description: error?.message || "An unknown error occurred",
				});
			}
		},
	});

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<CardTitle className="text-2xl font-bold">Sign In</CardTitle>
				<CardDescription>
					Welcome back! Sign in to your account.
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
							validators={{ onChange: signInSchema.shape.email }}
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
							validators={{ onChange: signInSchema.shape.password }}
						>
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<div className="flex items-center justify-between">
										<FieldLabel htmlFor={field.name}>Password</FieldLabel>
										<Link
											to="/auth/reset-password"
											className="text-xs text-blue-500 hover:underline"
										>
											Forgot password?
										</Link>
									</div>

									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											id={field.name}
											type={showPassword ? "text" : "password"}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="••••••••"
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

						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									type="submit"
									className="w-full mt-4"
									disabled={!canSubmit}
								>
									{isSubmitting ? "Signing in..." : "Sign In"}
								</Button>
							)}
						</form.Subscribe>

						<div className="mt-4 text-center text-sm">
							Don't have an account?{" "}
							<Link
								to="/auth/sign-up"
								className="text-blue-500 hover:underline"
							>
								Sign Up
							</Link>
						</div>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
