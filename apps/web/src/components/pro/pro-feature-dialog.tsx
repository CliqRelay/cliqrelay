import type { ComponentType } from "react";

import { extensionRegistry } from "@repo/extensions-sdk";

type FallbackProps = {
	isUpgradeAvailable: boolean;
	onUpgrade?: () => Promise<void>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type Props = {
	slotName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	FallbackComponent: ComponentType<FallbackProps>;
};

export function ProFeatureDialog({
	slotName,
	open,
	onOpenChange,
	FallbackComponent,
}: Props) {
	const slot = extensionRegistry.getSlot(slotName);

	if (slot) {
		const Component = slot.component;
		return <Component open={open} onOpenChange={onOpenChange} />;
	}

	return (
		<FallbackComponent
			isUpgradeAvailable={false}
			open={open}
			onOpenChange={onOpenChange}
		/>
	);
}
