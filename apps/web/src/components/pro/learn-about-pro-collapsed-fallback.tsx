import { Sparkles } from "lucide-react";

import { envClient } from "@/constants/env-client";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function LearnAboutProCollapsedFallback() {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={() =>
						window.open(envClient.siteUrl, "_blank", "noopener,noreferrer")
					}
					className="flex size-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
					aria-label="Learn more about Pro"
				>
					<Sparkles className="size-4.5" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="right" className="text-xs">
				Learn more about Pro
			</TooltipContent>
		</Tooltip>
	);
}
