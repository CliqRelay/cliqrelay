import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/",
)({
	beforeLoad: async ({ params }) => {
		throw redirect({
			to: "/dashboard/organizations/$orgId/settings/general",
			params: {
				orgId: params.orgId,
			},
		});
	},
});
