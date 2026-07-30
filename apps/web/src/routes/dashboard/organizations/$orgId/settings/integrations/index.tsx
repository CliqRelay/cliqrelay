import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsIntegrationsFallback } from "@/components/pro/org-settings-integrations-fallback";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/integrations",
)({
	component: OrgSettingsIntegrationsPageComponent,
});

function OrgSettingsIntegrationsPageComponent() {
	return (
		<ExtensionSlot
			name="org-settings-integrations"
			fallback={OrgSettingsIntegrationsFallback}
		/>
	);
}
