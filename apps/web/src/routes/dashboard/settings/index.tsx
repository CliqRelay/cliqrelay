import { createFileRoute, redirect } from "@tanstack/react-router";

import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";

export const Route = createFileRoute("/dashboard/settings/")({
	beforeLoad: async () => {
		const orgId = useOrgStore.getState().orgId;
		if (!orgId) {
			throw redirect({ to: "/dashboard" });
		}

		try {
			const teams = await authulaClient.organizations.listOrganizationTeams(orgId);
			if (teams.length > 0) {
				throw redirect({
					to: "/dashboard/settings/$teamId",
					params: { teamId: teams[0].id },
				});
			}
		} catch {
			// fall through
		}
		throw redirect({ to: "/dashboard" });
	},
});
