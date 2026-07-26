import { createFileRoute } from "@tanstack/react-router";

import { OrganizationSettingsMembersSection } from "@/components/settings/organization-settings-members-section";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/members",
)({
	component: OrganizationsSettingsMembersPageComponent,
});

function OrganizationsSettingsMembersPageComponent() {
	return <OrganizationSettingsMembersSection />;
}
