import { createFileRoute, isRedirect, Outlet, redirect } from "@tanstack/react-router";

import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";
import { SettingsLayout } from "@/components/settings/settings-layout";

export const Route = createFileRoute("/dashboard/settings")({
	beforeLoad: async () => {
		const orgId = useOrgStore.getState().orgId;
		if (!orgId) {
			throw redirect({ to: "/dashboard" });
		}

		try {
			const teams = await authulaClient.organizations.listOrganizationTeams(orgId);
			return { teams };
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/dashboard" });
		}
	},
	component: SettingsRoute,
});

function SettingsRoute() {
	const { teams } = Route.useRouteContext();

	return (
		<SettingsLayout teams={teams}>
			<Outlet />
		</SettingsLayout>
	);
}
