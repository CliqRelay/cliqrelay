import { extensionRegistry } from "@repo/extensions-sdk";

import { MoveToTeamFallback } from "../pro/move-to-team-fallback";

type Props = {
	guideId: string;
	isUpgradeAvailable: boolean;
	onUpgrade?: () => Promise<void>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function MoveToTeamSlot({
	guideId,
	isUpgradeAvailable,
	onUpgrade,
	open,
	onOpenChange,
}: Props) {
	const slot = extensionRegistry.getSlot("guide-move-to-team");

	if (slot) {
		const Component = slot.component;
		return (
			<Component guideId={guideId} open={open} onOpenChange={onOpenChange} />
		);
	}

	return (
		<MoveToTeamFallback
			isUpgradeAvailable={isUpgradeAvailable}
			onUpgrade={onUpgrade}
			open={open}
			onOpenChange={onOpenChange}
		/>
	);
}
