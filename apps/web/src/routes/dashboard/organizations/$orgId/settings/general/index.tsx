import { createFileRoute } from "@tanstack/react-router";

import { OrganizationSettingsGeneralSection } from "@/components/settings/organization-settings-general-section";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/general",
)({
	component: OrganizationsSettingsGeneralPageComponent,
});

function OrganizationsSettingsGeneralPageComponent() {
	return <OrganizationSettingsGeneralSection />;
}
