import type { ReactNode } from "react";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarTooltip({
	collapsed,
	label,
	children,
}: {
	collapsed: boolean;
	label: string;
	children: ReactNode;
}) {
	if (!collapsed) return <>{children}</>;

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>{children}</TooltipTrigger>
				<TooltipContent side="right" className="text-xs">
					{label}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
