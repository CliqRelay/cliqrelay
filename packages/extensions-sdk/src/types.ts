import type { ComponentType } from "react";

export interface NavItemRegistration {
  title: string;
  icon?: ComponentType<{ className?: string; size?: number }>;
  href?: string;
  children?: Omit<NavItemRegistration, "children">[];
  order?: number;
}

export interface SlotRegistration {
  name: string;
  component: ComponentType<Record<string, unknown>>;
}

export interface ExtensionDefinition {
  id: string;
  name?: string;
  slots: SlotRegistration[];
  navItems: NavItemRegistration[];
}
