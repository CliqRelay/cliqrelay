import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export const Route = createFileRoute(
	"/dashboard/organizations/$orgId/settings",
)({
	beforeLoad: async ({ params, context }) => {
		const orgs = (
			context as {
				orgs?: Array<{
					id: string;
					name: string;
					slug: string;
					ownerId: string;
				}>;
			}
		).orgs;
		if (!orgs || !orgs.some((o) => o.id === params.orgId)) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: SettingsLayout,
});

function SettingsLayout() {
	return (
		<div className="flex h-full">
			<SettingsSidebar />
			<div className="flex-1 overflow-auto">
				<div className="mx-auto max-w-3xl p-8">
					<Outlet />
				</div>
			</div>
		</div>
	);
}
