import { afterEach, describe, expect, test, vi } from "vitest";

import {
	buildRecentGuidesParams,
	RECENT_GUIDES_LIMIT,
} from "./useRecentGuides";

describe("RecentGuides", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("buildRecentGuidesParams", () => {
		test("should request the most recently updated guides when given a team id", () => {
			const params = buildRecentGuidesParams("team-123");

			expect(params).toEqual({
				team_id: "team-123",
				page: 1,
				limit: RECENT_GUIDES_LIMIT,
				sort_by: "updated_at",
				sort_dir: "desc",
				exclude_archived: true,
			});
		});

		test("should omit the team id when there is no active team", () => {
			const params = buildRecentGuidesParams(null);

			expect(params.team_id).toBeUndefined();
			expect(params).toEqual({
				team_id: undefined,
				page: 1,
				limit: RECENT_GUIDES_LIMIT,
				sort_by: "updated_at",
				sort_dir: "desc",
				exclude_archived: true,
			});
		});

		test("should cap the list at five guides", () => {
			expect(RECENT_GUIDES_LIMIT).toBe(5);
			expect(buildRecentGuidesParams("team-123").limit).toBe(5);
		});
	});
});
