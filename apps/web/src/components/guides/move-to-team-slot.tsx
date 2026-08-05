import { extensionRegistry } from "@repo/extensions-sdk";

import { MoveToTeamFallback } from "../pro/move-to-team-fallback";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

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
	const slot = extensionRegistry.getSlot(ExtensionSlotKeys.GUIDE_MOVE_TO_TEAM);

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
