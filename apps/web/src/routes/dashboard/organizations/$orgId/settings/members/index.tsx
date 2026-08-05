import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsMembersFallback } from "@/components/pro/org-settings-members-fallback";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings/members",
)({
	component: OrganizationsSettingsMembersPage,
});

function OrganizationsSettingsMembersPage() {
	return (
		<ExtensionSlot
			name={ExtensionSlotKeys.ORG_SETTINGS_MEMBERS}
			fallback={OrgSettingsMembersFallback}
		/>
	);
}
