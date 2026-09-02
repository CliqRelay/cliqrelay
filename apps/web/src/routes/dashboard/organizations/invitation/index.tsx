import { createFileRoute, isRedirect, redirect, useNavigate } from "@tanstack/react-router";

import type { OrganizationInvitationStatus } from "authula";

import { z } from "zod";

import type { AppUser } from "@/models";

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
import { toast } from "@/lib/toast";
import { isInvitationRecipient } from "@/utils/invitations.utils";

const invitationSearchSchema = z.object({
  organization_id: z.string().min(1).optional(),
  invitation_id: z.string().min(1).optional(),
});

type InvitationDetails = {
  organizationName: string;
  role: string;
  status: OrganizationInvitationStatus;
  expiresAt: string;
};

type InvitationContext = {
  organizationId: string;
  invitationId: string;
  invitation: InvitationDetails | null;
};

export const Route = createFileRoute("/dashboard/organizations/invitation")({
  validateSearch: invitationSearchSchema,
  beforeLoad: async ({ search, context }): Promise<InvitationContext> => {
    const { organization_id: organizationId, invitation_id: invitationId } = search;
    const ctx = context as { user?: AppUser };
    const userEmail = ctx.user?.email;

    if (!organizationId || !invitationId || !userEmail) {
      throw redirect({ to: "/dashboard" });
    }

    try {
      const { invitation, organization } =
        await authulaClient.organizations.getOrganizationInvitation(organizationId, invitationId);

      if (
        !isInvitationRecipient({
          invitationEmail: invitation.email,
          userEmail,
        })
      ) {
        throw redirect({ to: "/dashboard" });
      }

      return {
        organizationId,
        invitationId,
        invitation: {
          organizationName: organization.name,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        },
      };
    } catch (error: unknown) {
      if (isRedirect(error)) {
        throw error;
      }

      return { organizationId, invitationId, invitation: null };
    }
  },
  component: OrganizationInvitationPage,
  pendingComponent: InvitationPendingCard,
  errorComponent: ({ error }) => {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";

    return (
      <div className="grid h-full w-full place-items-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">Invitation Error</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  },
});

function InvitationPendingCard() {
  return (
    <div className="grid h-full w-full place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationInvitationPage() {
  const navigate = useNavigate();
  const { organizationId, invitationId, invitation } = Route.useRouteContext();

  const acceptMutation = authulaClient.organizations.useAcceptOrganizationInvitation({
    mutation: {
      onSuccess: () => {
        toast.success("Invitation accepted");
        navigate({ to: "/dashboard" });
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to accept invitation");
      },
    },
  });

  const rejectMutation = authulaClient.organizations.useRejectOrganizationInvitation({
    mutation: {
      onSuccess: () => {
        toast.success("Invitation rejected");
        navigate({ to: "/dashboard" });
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to reject invitation");
      },
    },
  });

  if (!invitation) {
    return (
      <div className="grid h-full w-full place-items-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">
              Invalid Invitation
            </CardTitle>
            <CardDescription>This invitation could not be found or has expired.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isPending = invitation.status === "pending";
  const isActionLoading = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <div className="grid h-full w-full place-items-center p-4">
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-10">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">You've been invited to join</CardTitle>
            <CardDescription className="mt-2 text-lg text-foreground">
              <span className="font-semibold text-primary">{invitation.organizationName}</span>
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
              <p className="text-center text-sm text-destructive">This invitation has expired.</p>
            )}
          </CardContent>
          {isPending && !isExpired && (
            <CardFooter className="flex justify-center gap-3">
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
                    <Spinner className="mr-2 h-4 w-4" />
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
                    <Spinner className="mr-2 h-4 w-4" />
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
              <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
                Go to Dashboard
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
