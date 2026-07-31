import type { PropsWithChildren } from "react";

import { type AppUserRole, hasMinimumRole } from "@repo/data-commons";

import { useOrgStore } from "@/stores/org-store";

type RoleGuardProps = {
	minRole: AppUserRole;
	fallback?: React.ReactNode;
};

export function RoleGuard({
	minRole,
	children,
	fallback = null,
}: PropsWithChildren<RoleGuardProps>) {
	const currentMemberRole = useOrgStore((s) => s.currentMember?.role);
	if (!currentMemberRole) {
		return <>{fallback}</>;
	}

	if (minRole) {
		if (!hasMinimumRole(currentMemberRole as AppUserRole, minRole)) {
			return <>{fallback}</>;
		}
		return <>{children}</>;
	}

	return <>{children}</>;
}
