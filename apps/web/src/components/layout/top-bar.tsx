import { Activity, Bell, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppUser } from "@/models/auth";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { OrgDropdown } from "./org-dropdown";
import UserDropdown from "./user-dropdown";

export function TopBar({
	onMenuToggle,
	user,
}: {
	onMenuToggle?: () => void;
	user?: AppUser | null;
}) {
	return (
		<header className="sticky top-0 z-30 h-14 flex items-center gap-2 px-6 border-b bg-background">
			{onMenuToggle && (
				<button
					type="button"
					className="md:hidden size-9 rounded-[14px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors bg-surface-1"
					aria-label="Open navigation menu"
					onClick={onMenuToggle}
				>
					<Menu className="size-4" />
				</button>
			)}

			<div className="flex-1 flex items-center">
				<OrgDropdown />
			</div>

			<div className="ml-auto flex items-center gap-2">
				{/* <Button
					type="button"
					aria-label="Notifications"
					variant="ghost"
					className="relative rounded-full"
				>
					<Bell className="size-4" />
					<span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
				</Button> */}

				<ThemeToggle
					className="size-8 rounded-[14px]"
					iconClassName="size-4"
					variant="circle-blur"
				/>

				{user && (
					<UserDropdown
						user={user}
						defaultOpen={false}
						align="end"
						trigger={
							<Button
								variant="ghost"
								className="size-8 rounded-[14px] flex items-center justify-center p-0 bg-surface-1"
							>
								<div className="size-7 rounded-md bg-linear-to-br from-sky-500 to-blue-700 flex items-center justify-center text-[10.5px] font-semibold text-white">
									{user.name
										?.split(" ")
										.map((n: string) => n[0])
										.join("")
										.slice(0, 2) || "?"}
								</div>
							</Button>
						}
					/>
				)}
			</div>
		</header>
	);
}
