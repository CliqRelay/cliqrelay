import type { ComponentType } from "react";

export type NavItem = {
  label?: string;
  isSection?: boolean;
  title?: string;
  icon?: ComponentType<{ className?: string; size?: number }>;
  href?: string;
  children?: NavItem[];
  isActive?: boolean;
};

export interface SlotRegistration {
  name: string;
  component: ComponentType<Record<string, unknown>>;
}

export interface ExtensionDefinition {
  id: string;
  name?: string;
  slots: SlotRegistration[];
  navItems: NavItem[];
}
