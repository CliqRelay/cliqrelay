import type {
	ExtensionDefinition,
	NavItemRegistration,
	SlotRegistration,
} from "./types";

export class ExtensionRegistry {
	private _frozen = false;
	private _extensions = new Map<string, ExtensionDefinition>();
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

		for (const slot of def.slots) {
			this._registerSlot(slot);
		}

		for (const navItem of def.navItems) {
			this._registerNavItem(navItem);
		}
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
		this._slots.clear();
		this._navItems = [];
	}
}

export const extensionRegistry = new ExtensionRegistry();
