import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { TeamSettingsMembersFallback } from "@/components/pro/team-settings-members-fallback";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/teams/$teamId/settings/members",
)({
	component: TeamMembersPageComponent,
});

function TeamMembersPageComponent() {
	return (
		<ExtensionSlot
			name="team-settings-members"
			fallback={TeamSettingsMembersFallback}
		/>
	);
}
