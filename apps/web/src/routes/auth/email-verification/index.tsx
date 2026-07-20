import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/auth/email-verification")({
	component: EmailVerificationPage,
});

function EmailVerificationPage() {
	const [isResending, setIsResending] = useState(false);
	const email =
		typeof window !== "undefined" ? localStorage.getItem("email") : null;

	const handleResend = async () => {
		setIsResending(true);
		try {
			await authulaClient.emailPassword.sendEmailVerification({
				callbackUrl: `${envClient.baseUrl}/dashboard`,
			});

			toast({
				title: "Email sent",
				description: "Verification email has been resent.",
			});
		} catch (error: any) {
			toast({
				title: "Failed to resend",
				description: error?.message || "An unknown error occurred",
			});
		} finally {
			setIsResending(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<Mail className="h-6 w-6 text-primary" />
				</div>
				<CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
				<CardDescription>
					We've sent a verification link to{" "}
					<strong className="text-foreground">{email || "your email"}</strong>.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-4">
					<p className="text-center text-sm text-muted-foreground">
						Click the link in the email to verify your account. If you don't see
						the email, check your spam folder.
					</p>

					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={handleResend}
						disabled={isResending}
					>
						<Send className="mr-2 h-4 w-4" />
						{isResending ? "Sending..." : "Resend Verification Email"}
					</Button>

					<div className="mt-2 text-center text-sm">
						<Link
							to="/auth/sign-in"
							className="inline-flex items-center gap-1 text-blue-500 hover:underline"
						>
							<ArrowLeft className="h-3 w-3" />
							Back to Sign In
						</Link>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
