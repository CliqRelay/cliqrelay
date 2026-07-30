import type { PropsWithChildren } from "react";

import type { AppUser } from "@/models/auth";
import { DashboardShell } from "./dashboard-shell";

type Props = {
	user: AppUser;
};

export function DashboardLayout({ children, user }: PropsWithChildren<Props>) {
	return <DashboardShell user={user}>{children}</DashboardShell>;
}
