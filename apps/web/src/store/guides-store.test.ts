import { describe, expect, test } from "vitest";

import { useGuidesStore } from "./guides-store";

describe("GuidesStore", () => {
	beforeEach(() => {
		useGuidesStore.setState({ filter: "all" });
	});

	test("should initialize with default values", () => {
		const state = useGuidesStore.getState();
		expect(state.filter).toBe("all");
	});

	test("should update filter", () => {
		useGuidesStore.getState().setFilter("draft");
		expect(useGuidesStore.getState().filter).toBe("draft");
	});
});
