import { afterEach, describe, expect, test, vi } from "vitest";

import { api, type Guide } from "@repo/api-client";

import { createGuide } from "./guides";

vi.mock("@repo/api-client", () => ({
	api: {
		guides: {
			createGuide: vi.fn(),
		},
	},
}));

vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		let handler: ((opts: any) => any) | undefined;
		const chain: any = {
			validator: () => chain,
			middleware: () => chain,
			handler: (fn: (opts: any) => any) => {
				handler = fn;
				return (opts: any) =>
					handler!({ ...opts, context: { headers: new Headers() } });
			},
		};
		return chain;
	},
}));

vi.mock("@tanstack/react-start/server", () => ({
	getCookie: vi.fn(),
}));

vi.mock("@/middleware/auth.middleware", () => ({
	authMiddleware: {},
}));

vi.mock("../utils/http.utils", () => ({
	getCsrfTokenHeader: vi.fn(() => ({})),
}));

vi.mock("@repo/data-commons", () => ({
	COOKIE_CONSTANTS: { activeTeamId: { name: "activeTeamId" } },
}));

const mockGuide: Guide = {
	id: "guide-1",
	title: "Test Guide",
	description: null,
	creatorId: "user-1",
	teamId: "team-1",
	status: "draft",
	visibility: "private",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
	durationSeconds: 0,
	isStarred: false,
};

describe("GuideServerFunctions", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("createGuide", () => {
		test("should return the created guide on success", async () => {
			vi.mocked(api.guides.createGuide).mockResolvedValue({ guide: mockGuide });

			const result = await createGuide({
				data: {
					title: "Test Guide",
					description: "desc",
					teamId: "team-1",
				},
			});

			expect(result).toEqual(mockGuide);
			expect(api.guides.createGuide).toHaveBeenCalledTimes(1);
			expect(api.guides.createGuide).toHaveBeenCalledWith(
				{ title: "Test Guide", description: "desc", teamId: "team-1" },
				expect.objectContaining({
					headers: expect.objectContaining({ Cookie: "" }),
				}),
			);
		});

		test("should rethrow the API error so callers can surface its message", async () => {
			vi.mocked(api.guides.createGuide).mockRejectedValue(
				new Error("Guide limit reached for your plan"),
			);

			await expect(
				createGuide({ data: { title: "Untitled Guide", teamId: "team-1" } }),
			).rejects.toThrow("Guide limit reached for your plan");
		});
	});
});
