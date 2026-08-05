import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { OrganizationSettingsSidebar } from "@/components/settings/organization-settings-sidebar";
import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings",
)({
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
		if (!ctx.orgs?.some((o) => o.id === params.orgId)) {
			throw redirect({ to: "/dashboard" });
		}

		if (ctx.user?.id) {
			try {
				const members =
					await authulaClient.organizations.listOrganizationMembers(
						params.orgId,
					);
				const currentMember =
					members?.find((m) => m.user.id === ctx.user?.id) ?? null;
				if (currentMember) {
					useOrgStore.getState().setCurrentMember(currentMember);
				}
			} catch {
				// Non-critical — sidebar will show fewer items
			}
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
