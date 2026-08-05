import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsBrandingFallback } from "@/components/pro/org-settings-branding-fallback";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/branding",
)({
	component: OrganizationSettingsBrandingPage,
});

function OrganizationSettingsBrandingPage() {
	return (
		<ExtensionSlot
			name={ExtensionSlotKeys.ORG_SETTINGS_BRANDING}
			fallback={OrgSettingsBrandingFallback}
		/>
	);
}
