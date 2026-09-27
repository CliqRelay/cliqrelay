import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppUserRole, hasMinimumRole } from "@repo/data-commons";

import { OrganizationSettingsSidebar } from "@/components/settings/organization-settings-sidebar";
import { getMyOrgMembership } from "@/server-fns/organizations";
import { useOrgStore } from "@/stores";

export const Route = createFileRoute("/dashboard/organizations/$orgId/settings")({
  beforeLoad: async ({ params, context }) => {
    const ctx = context as {
      orgs?: Array<{
        id: string;
        name: string;
        slug: string;
        ownerId: string;
      }>;
      user?: { id: string };
    };
    const org = ctx.orgs?.find((o) => o.id === params.orgId);
    if (!org || !ctx.user?.id) {
      throw redirect({ to: "/dashboard" });
    }

    // Null when not a member — only org ownership can grant access then.
    const currentMember = await getMyOrgMembership({ data: params.orgId });

    const isOwner = org.ownerId === ctx.user.id;
    const isAdmin = hasMinimumRole(currentMember?.role as AppUserRole, AppUserRole.ADMIN);

    if (!isOwner && !isAdmin) {
      throw redirect({ to: "/dashboard" });
    }

    if (currentMember) {
      useOrgStore.getState().setCurrentMember(currentMember);
    }
  },
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <div className="flex h-full">
      <OrganizationSettingsSidebar />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
