import { createFileRoute } from "@tanstack/react-router";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { OrgSettingsTeamsFallback } from "@/components/pro/org-settings-teams-fallback";
import { OrgSettingsPage } from "@/components/settings/org-settings-page";
import { OrgSettingsUpgradeSkeleton } from "@/components/settings/org-settings-skeletons";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

export const Route = createFileRoute("/dashboard/organizations/$orgId/settings/teams")({
  component: OrganizationSettingsTeamsPage,
});

function OrganizationSettingsTeamsPage() {
  return (
    <OrgSettingsPage skeleton={<OrgSettingsUpgradeSkeleton />}>
      <ExtensionSlot
        name={ExtensionSlotKeys.ORG_SETTINGS_TEAMS}
        fallback={OrgSettingsTeamsFallback}
      />
    </OrgSettingsPage>
  );
}
