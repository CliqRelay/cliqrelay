import type { ComponentType } from "react";

import { extensionRegistry } from "./registry";

type ExtensionSlotProps = {
	name: string;
	fallback?: ComponentType<any>;
};

export function ExtensionSlot({
	name,
	fallback: Fallback,
}: ExtensionSlotProps) {
	const slot = extensionRegistry.getSlot(name);

	if (slot) {
		const SlotComponent = slot.component;
		return <SlotComponent />;
	}

	if (Fallback) {
		return <Fallback />;
	}

	return null;
}
