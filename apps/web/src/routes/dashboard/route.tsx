import { useEffect } from "react";

import {
	createFileRoute,
	isRedirect,
	Outlet,
	redirect,
} from "@tanstack/react-router";

import { authulaClient } from "@/lib/authula-client";
import { getActiveOrgCookie, setActiveOrgCookie } from "@/lib/org-cookie";
import { useOrgStore, useUserStore } from "@/stores";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { AppOrganizationMemberResponse, AppUser } from "@/models";

type OrgInfo = {
	id: string;
	ownerId: string;
	name: string;
	slug: string;
};

type ContextType = {
	user: AppUser;
	orgs: OrgInfo[];
	activeOrg: OrgInfo | null;
	currentMember: AppOrganizationMemberResponse | null;
};

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async ({ location }): Promise<ContextType> => {
		let userResponse: { user: AppUser };
		try {
			const response = await authulaClient.core.getMe();
			if (!response.user.emailVerified) {
				throw redirect({ to: "/auth/email-verification" });
			}
			userResponse = {
				user: response.user as AppUser,
			};
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/auth/sign-up" });
		}

		let cookieHeader: string | undefined;
		if (import.meta.env.SSR) {
			try {
				const { getStartContext } = await import(
					"@tanstack/start-storage-context"
				);
				const ctx = getStartContext({ throwIfNotFound: false });
				cookieHeader = ctx?.request?.headers?.get("Cookie") ?? undefined;
			} catch {
				// Not in a server request context
			}
		}

		try {
			const organizations =
				await authulaClient.organizations.listOrganizations();

			const isInvitationPage =
				location.pathname === "/dashboard/organizations/invitation";

			if (!organizations || organizations.length === 0) {
				if (!isInvitationPage) {
					throw redirect({ to: "/create-organization" });
				}
				return {
					user: userResponse.user,
					orgs: [],
					activeOrg: null,
					currentMember: null,
				};
			}

			const org = organizations[0];
			const cookieOrgId = getActiveOrgCookie(cookieHeader);
			const isOrgValid = organizations.some(
				(o: OrgInfo) => o.id === cookieOrgId,
			);
			const activeOrgId = isOrgValid ? cookieOrgId! : org.id;
			const activeOrg =
				organizations.find((o: OrgInfo) => o.id === activeOrgId) ?? org;

			if (!isOrgValid) {
				setActiveOrgCookie(activeOrg.id);
			}

			let currentMember: AppOrganizationMemberResponse | null = null;
			try {
				const members =
					(await authulaClient.organizations.listOrganizationMembers(
						activeOrg.id,
					)) as AppOrganizationMemberResponse[] | null;
				currentMember =
					members?.find((m) => m.user.id === userResponse.user.id) ?? null;
			} catch {
				// Non-critical
			}

			return {
				user: userResponse.user,
				orgs: organizations,
				activeOrg,
				currentMember,
			};
		} catch (error: unknown) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/create-organization" });
		}
	},
	component: DashboardRoute,
});

function DashboardRoute() {
	const ctx = Route.useRouteContext();

	useEffect(() => {
		useUserStore.getState().setUser(ctx.user.id, ctx.user.name, ctx.user.email);
		if (ctx.activeOrg) {
			useOrgStore
				.getState()
				.setOrg(ctx.activeOrg.id, ctx.activeOrg.name, ctx.activeOrg.ownerId);
		}
		useOrgStore.getState().setOrganizations(ctx.orgs);
		if (ctx.currentMember) {
			useOrgStore.getState().setCurrentMember(ctx.currentMember);
		}
	}, [
		ctx.user.id,
		ctx.orgs,
		ctx.activeOrg,
		ctx.currentMember,
		ctx.user.email,
		ctx.user.name,
	]);

	// Hydrate org store during SSR so data is available immediately on first render
	if (import.meta.env.SSR) {
		useUserStore.getState().setUser(ctx.user.id, ctx.user.name, ctx.user.email);
	}

	if (import.meta.env.SSR && ctx.activeOrg) {
		useOrgStore
			.getState()
			.setOrg(ctx.activeOrg.id, ctx.activeOrg.name, ctx.activeOrg.ownerId);
		useOrgStore.getState().setOrganizations(ctx.orgs);
		if (ctx.currentMember) {
			useOrgStore.getState().setCurrentMember(ctx.currentMember);
		}
	}

	return (
		<DashboardLayout user={ctx.user}>
			<Outlet />
		</DashboardLayout>
	);
}
