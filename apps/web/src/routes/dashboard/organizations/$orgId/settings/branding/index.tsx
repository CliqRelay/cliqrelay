import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsBrandingFallback } from "@/components/pro/org-settings-branding-fallback";
import { OrgSettingsPage } from "@/components/settings/org-settings-page";
import { OrgSettingsUpgradeSkeleton } from "@/components/settings/org-settings-skeletons";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

export const Route = createFileRoute("/dashboard/organizations/$orgId/settings/branding")({
  component: OrganizationSettingsBrandingPage,
});

function OrganizationSettingsBrandingPage() {
  return (
    <OrgSettingsPage skeleton={<OrgSettingsUpgradeSkeleton />}>
      <ExtensionSlot
        name={ExtensionSlotKeys.ORG_SETTINGS_BRANDING}
        fallback={OrgSettingsBrandingFallback}
      />
    </OrgSettingsPage>
  );
}
