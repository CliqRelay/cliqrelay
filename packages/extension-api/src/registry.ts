import type {
	ExtensionDefinition,
	NavItemRegistration,
	RouteRegistration,
	SlotRegistration,
} from "./types";

export function normalizeRoute(path: string): string {
	return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

export class ExtensionRegistry {
	private _frozen = false;
	private _extensions = new Map<string, ExtensionDefinition>();
	private _routes: RouteRegistration[] = [];
	private _routesByPath = new Map<string, RouteRegistration>();
	private _slots = new Map<string, SlotRegistration>();
	private _navItems: NavItemRegistration[] = [];

	private assertNotFrozen(): void {
		if (this._frozen) {
			// throw new Error(
			// 	"ExtensionRegistry is frozen. No more extensions can be registered.",
			// );
			return;
		}
	}

	install(def: ExtensionDefinition): void {
		this.assertNotFrozen();

		if (this._extensions.has(def.id)) {
			// throw new Error(`Extension with id "${def.id}" is already registered.`);
			return;
		}

		this._extensions.set(def.id, def);

		for (const route of def.routes) {
			this._registerRoute(route);
		}

		for (const slot of def.slots) {
			this._registerSlot(slot);
		}

		for (const navItem of def.navItems) {
			this._registerNavItem(navItem);
		}
	}

	private _registerRoute(route: RouteRegistration): void {
		const normalized = normalizeRoute(route.path);
		const entry = { ...route, path: normalized };
		this._routes.push(entry);
		this._routesByPath.set(normalized, entry);
	}

	private _registerSlot(slot: SlotRegistration): void {
		this._slots.set(slot.name, slot);
	}

	private _registerNavItem(navItem: NavItemRegistration): void {
		this._navItems.push(navItem);
	}

	freeze(): void {
		this._frozen = true;
	}

	get isFrozen(): boolean {
		return this._frozen;
	}

	getRoutes(): RouteRegistration[] {
		return [...this._routes];
	}

	getRoute(path: string): RouteRegistration | undefined {
		return this._routesByPath.get(normalizeRoute(path));
	}

	resolveRoute(urlPath: string): RouteRegistration | undefined {
		const normalized = normalizeRoute(urlPath);
		return this._routesByPath.get(normalized);
	}

	getSlots(): SlotRegistration[] {
		return [...this._slots.values()];
	}

	getSlot(name: string): SlotRegistration | undefined {
		return this._slots.get(name);
	}

	getNavItems(): NavItemRegistration[] {
		return [...this._navItems];
	}

	getExtensions(): ExtensionDefinition[] {
		return [...this._extensions.values()];
	}

	clear(): void {
		this._frozen = false;
		this._extensions.clear();
		this._routes = [];
		this._routesByPath.clear();
		this._slots.clear();
		this._navItems = [];
	}
}

export const extensionRegistry = new ExtensionRegistry();
