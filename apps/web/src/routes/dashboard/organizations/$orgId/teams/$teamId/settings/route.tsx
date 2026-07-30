import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { TeamSettingsSidebar } from "@/components/settings/team-settings-sidebar";
import { authulaClient } from "@/lib/authula-client";
import { setActiveTeamCookie } from "@/lib/team-cookie";
import { useTeamStore } from "@/stores/team-store";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/teams/$teamId/settings",
)({
	beforeLoad: async ({ params, context }) => {
		const { orgId, teamId } = params;

		const orgs = (
			context as {
				orgs?: Array<{
					id: string;
					name: string;
					slug: string;
					ownerId: string;
				}>;
			}
		).orgs;
		if (!orgs?.some((o) => o.id === orgId)) {
			throw redirect({ to: "/dashboard" });
		}

		try {
			await authulaClient.organizations.getOrganizationTeam(orgId, teamId);
			useTeamStore.getState().setActiveTeam(teamId);
			setActiveTeamCookie(teamId);
		} catch {
			throw redirect({
				to: "/dashboard/organizations/$orgId/settings/teams",
				params: { orgId },
			});
		}
	},
	component: TeamSettingsLayout,
});

function TeamSettingsLayout() {
	const { orgId, teamId } = Route.useParams();

	const { data: team } = useQuery({
		queryKey: ["organization-team", orgId, teamId],
		queryFn: () =>
			authulaClient.organizations.getOrganizationTeam(orgId, teamId),
	});

	if (!team) {
		return null;
	}

	return (
		<div className="flex h-full">
			<TeamSettingsSidebar team={team} />
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-3xl p-8">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
