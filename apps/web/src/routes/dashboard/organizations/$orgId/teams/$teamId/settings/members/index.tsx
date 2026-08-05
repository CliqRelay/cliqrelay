import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { TeamSettingsMembersFallback } from "@/components/pro/team-settings-members-fallback";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/teams/$teamId/settings/members",
)({
	component: TeamSettingsMembersPage,
});

function TeamSettingsMembersPage() {
	return (
		<ExtensionSlot
			name={ExtensionSlotKeys.TEAM_SETTINGS_MEMBERS}
			fallback={TeamSettingsMembersFallback}
		/>
	);
}
