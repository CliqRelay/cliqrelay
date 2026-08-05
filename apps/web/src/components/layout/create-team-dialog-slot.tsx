import { extensionRegistry } from "@repo/extensions-sdk";

import { CreateTeamFallback } from "../pro/create-team-fallback";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateTeamDialogSlot({ open, onOpenChange }: Props) {
	const slot = extensionRegistry.getSlot(ExtensionSlotKeys.CREATE_TEAM_DIALOG);

	if (slot) {
		const Component = slot.component;
		return <Component open={open} onOpenChange={onOpenChange} />;
	}

	return (
		<CreateTeamFallback
			isUpgradeAvailable={false}
			open={open}
			onOpenChange={onOpenChange}
		/>
	);
}
