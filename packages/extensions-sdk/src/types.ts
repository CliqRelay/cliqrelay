import type { ComponentType } from "react";

export interface LoaderOptions {
  params: Record<string, string>;
  context: Record<string, unknown>;
  abortController: AbortController;
}

export interface BeforeLoadOptions {
  params: Record<string, string>;
  context: Record<string, unknown>;
  abortController: AbortController;
}

export interface RouteRegistration {
  key: string;
  path: string;
  component: ComponentType<Record<string, unknown>>;
  loader?: (opts: LoaderOptions) => Promise<Record<string, unknown>>;
  beforeLoad?: (opts: BeforeLoadOptions) => Promise<Record<string, unknown> | undefined>;
  pendingComponent?: ComponentType;
  errorComponent?: ComponentType<{ error: Error }>;
  notFoundComponent?: ComponentType;
  meta?: {
    label?: string;
    icon?: ComponentType<{ className?: string; size?: number }>;
    navSection?: string;
    order?: number;
  };
}

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
  routes: RouteRegistration[];
  slots: SlotRegistration[];
  navItems: NavItemRegistration[];
}

export type DefineRouteInput = Omit<RouteRegistration, "key"> & {
  key?: string;
};

export function defineRoute(input: DefineRouteInput): RouteRegistration {
  return {
    key: input.key ?? input.path,
    ...input,
  };
}
