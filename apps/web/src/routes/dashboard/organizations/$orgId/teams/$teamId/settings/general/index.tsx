import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { TeamSettingsGeneralSection } from "@/components/settings/team-settings-general-section";
import { authulaClient } from "@/lib/authula-client";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/teams/$teamId/settings/general",
)({
	component: TeamGeneralPageComponent,
});

function TeamGeneralPageComponent() {
	const { orgId, teamId } = Route.useParams();

	const { data: team } = useQuery({
		queryKey: ["organization-team", orgId, teamId],
		queryFn: () =>
			authulaClient.organizations.getOrganizationTeam(orgId, teamId),
	});

	if (!team) {
		return null;
	}

	return <TeamSettingsGeneralSection team={team} orgId={orgId} />;
}
