import { MousePointerClickIcon, KeyboardIcon, CompassIcon } from "lucide-react";

import type { StepAction } from "@repo/api-client";

import { Badge } from "@/components/ui/badge";

const stepActionIconMap: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	click: MousePointerClickIcon,
	input: KeyboardIcon,
	navigation: CompassIcon,
};

const stepActionLabelMap: Record<string, string> = {
	click: "Click",
	input: "Input",
	navigation: "Navigate",
};

type Props = {
	action?: StepAction | null;
	actionText?: string | null;
};

export function StepActionBadge({ action, actionText }: Props) {
	if (!action) return null;
	const Icon = stepActionIconMap[action];
	const label = stepActionLabelMap[action] ?? action;
	return (
		<Badge
			variant="secondary"
			className="gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium shadow-xs"
		>
			{Icon && <Icon className="h-3.5 w-3.5" />}
			{label}
			{actionText && (
				<span className="font-normal text-muted-foreground">
					: {actionText}
				</span>
			)}
		</Badge>
	);
}
