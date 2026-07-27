import { createFileRoute } from "@tanstack/react-router";

import { OrgSettingsTeamsFallback } from "@/components/settings/org-settings-teams-fallback";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/teams",
)({
	component: OrgSettingsTeamsPageComponent,
});

function OrgSettingsTeamsPageComponent() {
	return <OrgSettingsTeamsFallback isUpgradeAvailable={false} />;
}
