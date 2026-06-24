import type { ComponentType, ReactNode, SVGAttributes } from "react";

import { useNavigate } from "@tanstack/react-router";
import { LogOut, UserRound } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authulaClient } from "@/lib/authula-client";
import type { AppUser } from "@/models/auth";

type LucideIcon = ComponentType<SVGAttributes<SVGElement>>;

type MenuItem = {
	label: string;
	icon: LucideIcon;
	destructive?: boolean;
};

const LOGOUT_ITEM: MenuItem = {
	label: "Sign Out",
	icon: LogOut,
	destructive: true,
};

const itemClass =
	"p-2 text-sm font-medium text-popover-foreground cursor-pointer gap-2";

type Props = {
	user: AppUser;
	trigger: ReactNode;
	defaultOpen?: boolean;
	align?: "start" | "center" | "end";
};

export default function UserDropdown({
	user,
	trigger,
	defaultOpen,
	align = "end",
}: Props) {
	const navigate = useNavigate();

	const handleSignOut = async () => {
		try {
			await authulaClient.signOut({});
			navigate({ to: "/auth/sign-in" });
		} catch (error) {
			console.error("Error signing out:", error);
		}
	};
	return (
		<div className="flex items-center justify-center">
			<DropdownMenu defaultOpen={defaultOpen}>
				<DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
				<DropdownMenuContent
					align={align}
					className="w-3xs rounded-2xl data-open:slide-in-from-bottom-20! data-closed:slide-out-to-bottom-20 data-open:fade-in-0 data-closed:fade-out-0 data-closed:zoom-out-100 duration-400"
				>
					<DropdownMenuGroup>
						<DropdownMenuLabel className="flex items-center gap-3 px-4 py-3">
							<div className="relative">
								<UserRound className="dark:text-white" />
								<span className="ring-card absolute right-0 bottom-0 size-2 rounded-full bg-green-600 ring-2" />
							</div>

							<div className="flex flex-col">
								<span className="text-popover-foreground text-sm font-medium">
									{user.name}
								</span>
								<span className="text-muted-foreground text-sm">
									{user.email}
								</span>
							</div>
						</DropdownMenuLabel>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						variant="destructive"
						className={itemClass}
						onClick={handleSignOut}
					>
						<LOGOUT_ITEM.icon />
						<span>{LOGOUT_ITEM.label}</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
