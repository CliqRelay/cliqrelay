import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsIntegrationsFallback } from "@/components/pro/org-settings-integrations-fallback";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/integrations",
)({
	component: OrganizationSettingsIntegrationsPage,
});

function OrganizationSettingsIntegrationsPage() {
	return (
		<ExtensionSlot
			name={ExtensionSlotKeys.ORG_SETTINGS_INTEGRATIONS}
			fallback={OrgSettingsIntegrationsFallback}
		/>
	);
}
