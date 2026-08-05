import { extensionRegistry } from "@repo/extensions-sdk";

import { CreateOrganizationFallback } from "../pro/create-organization-fallback";
import { ExtensionSlotKeys } from "@/constants/extension-slots";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateOrganizationDialogSlot({ open, onOpenChange }: Props) {
	const slot = extensionRegistry.getSlot(
		ExtensionSlotKeys.CREATE_ORGANIZATION_DIALOG,
	);

	if (slot) {
		const Component = slot.component;
		return <Component open={open} onOpenChange={onOpenChange} />;
	}

	return (
		<CreateOrganizationFallback
			isUpgradeAvailable={false}
			open={open}
			onOpenChange={onOpenChange}
		/>
	);
}
