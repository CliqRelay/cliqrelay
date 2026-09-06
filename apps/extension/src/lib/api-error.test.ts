import { describe, expect, test } from "vitest";

import { ApiError } from "@repo/api-client";

import { isUnauthorizedError } from "./api-error";

const buildApiError = (status: number) =>
	new ApiError("Request failed", status, null, new Headers());

describe("isUnauthorizedError", () => {
	test("should be true for a 401 from the API", () => {
		expect(isUnauthorizedError(buildApiError(401))).toBe(true);
	});

	test("should be true for a 403 from the API", () => {
		expect(isUnauthorizedError(buildApiError(403))).toBe(true);
	});

	test("should be false for other API failures", () => {
		expect(isUnauthorizedError(buildApiError(404))).toBe(false);
		expect(isUnauthorizedError(buildApiError(500))).toBe(false);
	});

	test("should be false for errors that are not ApiError", () => {
		expect(isUnauthorizedError(new Error("Network down"))).toBe(false);
		expect(isUnauthorizedError({ status: 401 })).toBe(false);
		expect(isUnauthorizedError(undefined)).toBe(false);
		expect(isUnauthorizedError(null)).toBe(false);
	});
});
