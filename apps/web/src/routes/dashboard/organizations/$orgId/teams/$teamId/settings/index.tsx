import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/teams/$teamId/settings/",
)({
	beforeLoad: async ({ params }) => {
		throw redirect({
			to: "/dashboard/organizations/$orgId/teams/$teamId/settings/general",
			params: {
				orgId: params.orgId,
				teamId: params.teamId,
			},
		});
	},
});
