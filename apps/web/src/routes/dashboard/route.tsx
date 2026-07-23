import {
	createFileRoute,
	isRedirect,
	Outlet,
	redirect,
} from "@tanstack/react-router";

import { DashboardLayout } from "@/components/layout";
import type { UserWithModifiedMetadata } from "@/models";
import { authulaClient } from "@/lib/authula-client";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async () => {
		let userResponse: { user: UserWithModifiedMetadata };
		try {
			const response = await authulaClient.core.getMe();
			if (!response.user.emailVerified) {
				throw redirect({ to: "/auth/email-verification" });
			}
			userResponse = {
				user: response.user as UserWithModifiedMetadata,
			};
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/auth/sign-up" });
		}

		try {
			const organizations =
				await authulaClient.organizations.listOrganizations();

			if (!organizations || organizations.length === 0) {
				throw redirect({ to: "/create-organization" });
			}
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/create-organization" });
		}

		return userResponse;
	},
	component: DashboardRoute,
});

function DashboardRoute() {
	const { user } = Route.useRouteContext();

	return (
		<DashboardLayout user={user}>
			<Outlet />
		</DashboardLayout>
	);
}
