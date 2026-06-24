import {
	createFileRoute,
	isRedirect,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import type { GetMeResponse } from "authula";

import { DashboardLayout } from "@/components/layout";
import type { UserWithModifiedMetadata } from "@/models";
import { authulaClient } from "@/lib/authula-client";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async () => {
		try {
			const me = await authulaClient.getMe<GetMeResponse>();
			if (!me.user.emailVerified) {
				throw redirect({ to: "/auth/email-verification" });
			}

			return {
				user: me.user as UserWithModifiedMetadata,
			};
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/auth/sign-up" });
		}
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
