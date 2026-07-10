import {
	createFileRoute,
	isRedirect,
	Outlet,
	redirect,
} from "@tanstack/react-router";

import type { UserWithModifiedMetadata } from "@/models";
import { authulaClient } from "@/lib/authula-client";

export const Route = createFileRoute("/auth")({
	beforeLoad: async ({ location }) => {
		try {
			const response = await authulaClient.core.getMe();
			if (!response.user.emailVerified) {
				if (location.pathname !== "/auth/email-verification") {
					throw redirect({ to: "/auth/email-verification" });
				}

				return {
					user: response.user as UserWithModifiedMetadata,
				};
			}
			throw redirect({ to: "/dashboard" });
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			if (location.pathname === "/auth") {
				throw redirect({ to: "/auth/sign-in" });
			}
		}
	},
	component: AuthRouteComponent,
});

function AuthRouteComponent() {
	return (
		<div className="w-full h-full p-4 grid place-items-center">
			<div className="w-full flex flex-col justify-center items-center gap-10">
				<img
					src="/app-logo-dark.png"
					alt="App Logo"
					className="h-16 w-max block dark:hidden"
				/>
				<img
					src="/app-logo-light.png"
					alt="App Logo"
					className="h-16 w-max hidden dark:block"
				/>
				<Outlet />
			</div>
		</div>
	);
}
