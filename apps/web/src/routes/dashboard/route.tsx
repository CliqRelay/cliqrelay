import {
	createFileRoute,
	isRedirect,
	Outlet,
	redirect,
} from "@tanstack/react-router";

import { DashboardLayout } from "@/components/layout";
import type { UserWithModifiedMetadata } from "@/models";
import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";
import {
	getActiveOrgCookie,
	setActiveOrgCookie,
} from "@/lib/org-cookie";

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

			const org = organizations[0];
			const cookieOrgId = getActiveOrgCookie();
			const isOrgValid = organizations.some((o) => o.id === cookieOrgId);
			const activeOrgId = isOrgValid ? cookieOrgId! : org.id;
			const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? org;

			if (!isOrgValid) {
				setActiveOrgCookie(activeOrg.id);
			}
			useOrgStore.getState().setOrg(activeOrg.id, activeOrg.name);
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
