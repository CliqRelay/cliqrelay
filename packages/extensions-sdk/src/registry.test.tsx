import type { ComponentType } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";

import { extensionRegistry } from "./registry";
import { ExtensionSlot } from "./slot";
import type { ExtensionDefinition } from "./types";

beforeEach(() => {
	extensionRegistry.clear();
});

describe("ExtensionRegistry", () => {
	describe("install", () => {
		it("registers slots and nav items from an extension definition", () => {
			const DummyComponent: ComponentType<Record<string, unknown>> = () => null;

			const ext: ExtensionDefinition = {
				id: "test",
				name: "Test Extension",
				slots: [
					{
						name: "test-slot",
						component: DummyComponent,
					},
				],
				navItems: [
					{
						title: "Test Nav",
						href: "/test",
					},
				],
			};

			extensionRegistry.install(ext);

			expect(extensionRegistry.getSlots()).toHaveLength(1);
			expect(extensionRegistry.getSlots()[0].name).toBe("test-slot");
			expect(extensionRegistry.getNavItems()).toHaveLength(1);
			expect(extensionRegistry.getNavItems()[0].title).toBe("Test Nav");
			expect(extensionRegistry.getExtensions()).toHaveLength(1);
			expect(extensionRegistry.getExtensions()[0].id).toBe("test");
		});
	});

	describe("duplicate detection", () => {
		it("silently ignores duplicate extension ids", () => {
			const DummyComponent: ComponentType<Record<string, unknown>> = () => null;

			const ext: ExtensionDefinition = {
				id: "dup",
				slots: [{ name: "original-slot", component: DummyComponent }],
				navItems: [],
			};

			extensionRegistry.install(ext);

			// Second install with same id should be silently ignored
			extensionRegistry.install({
				id: "dup",
				slots: [{ name: "replacement-slot", component: DummyComponent }],
				navItems: [],
			});

			// Original slot should remain, not replaced
			expect(extensionRegistry.getSlot("original-slot")).toBeDefined();
			expect(extensionRegistry.getSlot("replacement-slot")).toBeUndefined();
		});
	});

	describe("freeze lifecycle", () => {
		it("reports frozen state correctly", () => {
			expect(extensionRegistry.isFrozen).toBe(false);
			extensionRegistry.freeze();
			expect(extensionRegistry.isFrozen).toBe(true);
		});
	});

	describe("clear", () => {
		it("resets the registry to unfrozen empty state", () => {
			const DummyComponent: ComponentType<Record<string, unknown>> = () => null;

			extensionRegistry.install({
				id: "clear-test",
				slots: [{ name: "my-slot", component: DummyComponent }],
				navItems: [],
			});
			extensionRegistry.freeze();

			extensionRegistry.clear();

			expect(extensionRegistry.isFrozen).toBe(false);
			expect(extensionRegistry.getSlots()).toHaveLength(0);
			expect(extensionRegistry.getExtensions()).toHaveLength(0);
		});
	});

	describe("getSlot", () => {
		it("returns undefined for unregistered slot", () => {
			expect(extensionRegistry.getSlot("nonexistent")).toBeUndefined();
		});

		it("returns the registered slot component", () => {
			const DummyComponent: ComponentType<Record<string, unknown>> = () => null;

			extensionRegistry.install({
				id: "slot-test",
				slots: [{ name: "my-slot", component: DummyComponent }],
				navItems: [],
			});

			const slot = extensionRegistry.getSlot("my-slot");
			expect(slot).toBeDefined();
			expect(slot?.name).toBe("my-slot");
			expect(slot?.component).toBe(DummyComponent);
		});
	});
});

describe("ExtensionSlot", () => {
	it("renders nothing when slot is not registered and no fallback", () => {
		const { container } = render(<ExtensionSlot name="missing" />);
		expect(container.innerHTML).toBe("");
	});

	it("renders fallback when slot is not registered", () => {
		const Fallback: ComponentType<Record<string, unknown>> = () => (
			<div>Fallback</div>
		);

		render(<ExtensionSlot name="missing" fallback={Fallback} />);

		expect(screen.getByText("Fallback")).toBeDefined();
	});

	it("renders registered slot component", () => {
		const SlotContent: ComponentType<Record<string, unknown>> = () => (
			<div>Slot Content</div>
		);

		extensionRegistry.install({
			id: "slot-test",
			slots: [{ name: "header-action", component: SlotContent }],
			navItems: [],
		});

		render(<ExtensionSlot name="header-action" />);

		expect(screen.getByText("Slot Content")).toBeDefined();
	});

	it("prefers registered slot over fallback", () => {
		const SlotContent: ComponentType<Record<string, unknown>> = () => (
			<div>Registered</div>
		);
		const Fallback: ComponentType<Record<string, unknown>> = () => (
			<div>Fallback</div>
		);

		extensionRegistry.install({
			id: "pref-test",
			slots: [{ name: "preferred", component: SlotContent }],
			navItems: [],
		});

		render(<ExtensionSlot name="preferred" fallback={Fallback} />);

		expect(screen.getByText("Registered")).toBeDefined();
		expect(screen.queryByText("Fallback")).toBeNull();
	});

	it("renders without crashing with multiple slots", () => {
		const SlotA: ComponentType<Record<string, unknown>> = () => <div>A</div>;
		const SlotB: ComponentType<Record<string, unknown>> = () => <div>B</div>;

		extensionRegistry.install({
			id: "multi-slot",
			slots: [
				{ name: "slot-a", component: SlotA },
				{ name: "slot-b", component: SlotB },
			],
			navItems: [],
		});

		const { container } = render(
			<div>
				<ExtensionSlot name="slot-a" />
				<ExtensionSlot name="slot-b" />
			</div>,
		);

		expect(container.textContent).toBe("AB");
	});
});
