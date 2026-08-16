import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppUserRole, hasMinimumRole } from "@repo/data-commons";

import { OrganizationSettingsSidebar } from "@/components/settings/organization-settings-sidebar";
import { authulaClient } from "@/lib/authula-client";
import type { AppOrganizationMemberResponse } from "@/models";
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
		const org = ctx.orgs?.find((o) => o.id === params.orgId);
		if (!org || !ctx.user?.id) {
			throw redirect({ to: "/dashboard" });
		}

		let currentMember: AppOrganizationMemberResponse | null = null;
		try {
			const members =
				(await authulaClient.organizations.listOrganizationMembers(
					params.orgId,
				)) as AppOrganizationMemberResponse[] | null;
			currentMember = members?.find((m) => m.user.id === ctx.user?.id) ?? null;
		} catch {
			// Membership could not be resolved — only org ownership can grant access
		}

		const isOwner = org.ownerId === ctx.user.id;
		const isAdmin = hasMinimumRole(
			currentMember?.role as AppUserRole,
			AppUserRole.ADMIN,
		);

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
