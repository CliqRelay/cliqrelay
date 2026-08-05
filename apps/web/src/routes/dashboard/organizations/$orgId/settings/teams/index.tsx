import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsTeamsFallback } from "@/components/pro/org-settings-teams-fallback";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/teams",
)({
	component: OrganizationSettingsTeamsPage,
});

function OrganizationSettingsTeamsPage() {
	return (
		<ExtensionSlot
			name={ExtensionSlotKeys.ORG_SETTINGS_TEAMS}
			fallback={OrgSettingsTeamsFallback}
		/>
	);
}
