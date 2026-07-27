import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsBrandingFallback } from "@/components/settings/org-settings-branding-fallback";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/branding",
)({
	component: OrgSettingsBrandingPageComponent,
});

function OrgSettingsBrandingPageComponent() {
	return (
		<ExtensionSlot
			name="org-settings-branding"
			fallback={OrgSettingsBrandingFallback}
		/>
	);
}
