import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsTeamsFallback } from "@/components/settings/org-settings-teams-fallback";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/teams",
)({
	component: OrgSettingsTeamsPageComponent,
});

function OrgSettingsTeamsPageComponent() {
	return (
		<ExtensionSlot
			name="org-settings-teams"
			fallback={OrgSettingsTeamsFallback}
		/>
	);
}
