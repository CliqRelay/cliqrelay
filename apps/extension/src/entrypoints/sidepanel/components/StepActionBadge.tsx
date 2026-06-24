import { Compass, Keyboard, MousePointerClick } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const actionConfigMap: Record<
	string,
	{ icon: typeof MousePointerClick; label: string }
> = {
	click: { icon: MousePointerClick, label: "Click" },
	input: { icon: Keyboard, label: "Input" },
	navigation: { icon: Compass, label: "Navigate" },
};

function getActionConfig(action: string) {
	return (
		actionConfigMap[action.toLowerCase()] ?? {
			icon: MousePointerClick,
			label: action,
		}
	);
}

type Props = {
	action?: string | null;
	actionText?: string | null;
};

export function StepActionBadge({ action, actionText }: Props) {
	if (!action) return null;
	const config = getActionConfig(action);
	const Icon = config.icon;

	return (
		<Badge
			variant="secondary"
			className="gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium shadow-xs"
		>
			<Icon className="size-3.5" />
			{config.label}
			{actionText && (
				<span className="font-normal text-muted-foreground">
					: {actionText}
				</span>
			)}
		</Badge>
	);
}
