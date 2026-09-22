import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsMembersFallback } from "@/components/pro/org-settings-members-fallback";
import { OrgSettingsPage } from "@/components/settings/org-settings-page";
import { OrgSettingsMembersSkeleton } from "@/components/settings/org-settings-skeletons";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

export const Route = createFileRoute("/dashboard/organizations/$orgId/settings/members")({
  component: OrganizationsSettingsMembersPage,
});

function OrganizationsSettingsMembersPage() {
  return (
    <OrgSettingsPage skeleton={<OrgSettingsMembersSkeleton />}>
      <ExtensionSlot
        name={ExtensionSlotKeys.ORG_SETTINGS_MEMBERS}
        fallback={OrgSettingsMembersFallback}
      />
    </OrgSettingsPage>
  );
}
