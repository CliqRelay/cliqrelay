import { extensionRegistry } from "@repo/extensions-sdk";

import { CreateTeamFallback } from "./teams/create-team-fallback";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateTeamDialogSlot({ open, onOpenChange }: Props) {
	const slot = extensionRegistry.getSlot("create-team-dialog");

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
