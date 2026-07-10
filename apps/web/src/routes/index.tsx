import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";

import { authulaClient } from "@/lib/authula-client";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		try {
			await authulaClient.core.getMe();
			throw redirect({ to: "/dashboard" });
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/auth" });
		}
	},
	component: IndexPage,
});

function IndexPage() {
	return <></>;
}
