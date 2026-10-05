import type { ComponentType } from "react";

import { extensionRegistry } from "./registry";

type ExtensionSlotProps = {
  name: string;
  fallback?: ComponentType<any>;
  props?: Record<string, unknown>;
};

export function ExtensionSlot({ name, fallback: Fallback, props }: ExtensionSlotProps) {
  const slot = extensionRegistry.getSlot(name);

  if (slot) {
    const SlotComponent = slot.component;
    return <SlotComponent {...(props ?? {})} />;
  }

  if (Fallback) {
    return <Fallback {...(props ?? {})} />;
  }

  return null;
}
