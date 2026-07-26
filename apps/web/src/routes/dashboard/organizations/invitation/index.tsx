import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { toCamelCaseKeys } from "es-toolkit";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { authulaClient } from "@/lib/authula-client";
import { authulaBrowserClient } from "@/lib/authula-client-browser";

const invitationSearchSchema = z
	.object({
		organization_id: z.string().optional(),
		invitation_id: z.string().optional(),
	})
	.transform((val) => toCamelCaseKeys(val));

export const Route = createFileRoute("/dashboard/organizations/invitation")({
	validateSearch: invitationSearchSchema,
	component: OrganizationInvitationPage,
	errorComponent: ({ error }) => {
		const message =
			error instanceof Error ? error.message : "An unexpected error occurred";

		return (
			<div className="w-full h-full p-4 grid place-items-center">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl font-bold text-destructive">
							Invitation Error
						</CardTitle>
						<CardDescription>{message}</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	},
});

function OrganizationInvitationPage() {
	const navigate = useNavigate();
	const search = Route.useSearch();
	const organizationId = search.organizationId ?? "";
	const invitationId = search.invitationId ?? "";

	const { data, isLoading, error } =
		authulaBrowserClient.organizations.useGetOrganizationInvitation(
			organizationId,
			invitationId,
			// {
			// 	request: {
			// 		credentials: "include",
			// 	},
			// },
		);

	const acceptMutation =
		authulaClient.organizations.useAcceptOrganizationInvitation({
			mutation: {
				onSuccess: () => {
					toast.success("Invitation accepted");
					navigate({ to: "/dashboard" });
				},
				onError: (err: unknown) => {
					toast.error(
						err instanceof Error ? err.message : "Failed to accept invitation",
					);
				},
			},
		});

	const rejectMutation =
		authulaClient.organizations.useRejectOrganizationInvitation({
			mutation: {
				onSuccess: () => {
					toast.success("Invitation rejected");
					navigate({ to: "/dashboard" });
				},
				onError: (err: unknown) => {
					toast.error(
						err instanceof Error ? err.message : "Failed to reject invitation",
					);
				},
			},
		});

	if (data) {
		// Clear any pending invitation from storage now that we've loaded it
		try {
			sessionStorage.removeItem("pendingInvitation");
		} catch {
			// sessionStorage not available
		}
	}

	if (isLoading) {
		return (
			<div className="w-full h-full p-4 grid place-items-center">
				<Card className="w-full max-w-md">
					<CardContent className="flex items-center justify-center py-12">
						<Spinner className="h-8 w-8" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="w-full h-full p-4 grid place-items-center">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl font-bold text-destructive">
							Invalid Invitation
						</CardTitle>
						<CardDescription>
							{error instanceof Error
								? error.message
								: "This invitation could not be found or has expired."}
						</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center">
						<Button
							variant="outline"
							onClick={() => navigate({ to: "/dashboard" })}
						>
							Go to Dashboard
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	const { organization, invitation } = data;
	const isExpired = new Date(invitation.expiresAt) < new Date();
	const isPending = invitation.status === "pending";
	const isActionLoading = acceptMutation.isPending || rejectMutation.isPending;

	return (
		<div className="w-full h-full p-4 grid place-items-center">
			<div className="w-full flex flex-col justify-center items-center gap-10 max-w-md">
				<Card className="w-full">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl font-bold">
							You've been invited to join
						</CardTitle>
						<CardDescription className="text-lg text-foreground mt-2">
							<span className="font-semibold text-primary">
								{organization.name}
							</span>
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
							<span>Role:</span>
							<Badge variant="secondary" className="capitalize">
								{invitation.role}
							</Badge>
						</div>

						{isExpired && (
							<p className="text-center text-sm text-destructive">
								This invitation has expired.
							</p>
						)}
					</CardContent>
					{isPending && !isExpired && (
						<CardFooter className="flex gap-3 justify-center">
							<Button
								variant="outline"
								onClick={() =>
									rejectMutation.mutate({
										organizationId,
										invitationId,
									})
								}
								disabled={isActionLoading}
							>
								{rejectMutation.isPending ? (
									<>
										<Spinner className="h-4 w-4 mr-2" />
										Rejecting...
									</>
								) : (
									"Reject"
								)}
							</Button>
							<Button
								variant="default"
								onClick={() =>
									acceptMutation.mutate({
										organizationId,
										invitationId,
									})
								}
								disabled={isActionLoading}
							>
								{acceptMutation.isPending ? (
									<>
										<Spinner className="h-4 w-4 mr-2" />
										Accepting...
									</>
								) : (
									"Accept Invitation"
								)}
							</Button>
						</CardFooter>
					)}
					{!isPending && (
						<CardFooter className="justify-center">
							<Button
								variant="outline"
								onClick={() => navigate({ to: "/dashboard" })}
							>
								Go to Dashboard
							</Button>
						</CardFooter>
					)}
				</Card>
			</div>
		</div>
	);
}
