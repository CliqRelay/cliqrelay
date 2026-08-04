import { extensionRegistry } from "@repo/extensions-sdk";

import { CreateOrganizationFallback } from "../pro/create-organization-fallback";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateOrganizationDialogSlot({ open, onOpenChange }: Props) {
	const slot = extensionRegistry.getSlot("create-organization-dialog");

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
