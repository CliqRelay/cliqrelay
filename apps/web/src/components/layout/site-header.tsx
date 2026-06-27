import { UserRound } from "lucide-react";

import { ExtensionSlot } from "@repo/extension-api";

import { SidebarTrigger } from "@/components/ui/sidebar";
import UserDropdown from "./user-dropdown";
import { ModeToggle } from "./mode-toggle";
import type { AppUser } from "@/models/auth";
import { Button } from "../ui/button";

type Props = {
	user: AppUser;
};

export function SiteHeader({ user }: Props) {
	return (
		<div className="flex w-full items-center justify-between">
			<div className="flex items-center gap-2">
				<SidebarTrigger className="-ml-1 h-8 w-8 cursor-pointer" />
			</div>
			<div className="flex items-center gap-1">
				<ExtensionSlot name="site-header-actions" />
				<ModeToggle />
				<UserDropdown
					user={user}
					defaultOpen={false}
					align="center"
					trigger={
						<Button variant="ghost" className="rounded-full p-2">
							<UserRound className="dark:text-white" />
						</Button>
					}
				/>
			</div>
		</div>
	);
}
