import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsMembersFallback } from "@/components/settings/org-settings-members-fallback";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/members",
)({
	component: OrganizationsSettingsMembersPageComponent,
});

function OrganizationsSettingsMembersPageComponent() {
	return (
		<ExtensionSlot
			name="org-settings-members"
			fallback={OrgSettingsMembersFallback}
		/>
	);
}
