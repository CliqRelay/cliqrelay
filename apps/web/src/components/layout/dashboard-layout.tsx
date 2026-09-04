import type { PropsWithChildren } from "react";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { ExtensionSlotKeys } from "@/constants/extension-slots";
import type { AppUser } from "@/models/auth";
import { DashboardShell } from "./dashboard-shell";

type Props = {
	user: AppUser;
};

export function DashboardLayout({ children, user }: PropsWithChildren<Props>) {
	return (
		<DashboardShell user={user}>
			<ExtensionSlot name={ExtensionSlotKeys.DASHBOARD_BANNER} />
			{children}
		</DashboardShell>
	);
}
