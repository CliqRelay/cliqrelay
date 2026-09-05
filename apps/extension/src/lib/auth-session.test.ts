import { describe, expect, test } from "vitest";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { buildSignInUrl, isSessionCookieSet } from "./auth-session";

describe("buildSignInUrl", () => {
	test("should point at the web app's sign-in page", () => {
		expect(buildSignInUrl("http://localhost:3000")).toBe(
			"http://localhost:3000/auth/sign-in",
		);
	});

	test("should not double the slash when the web url has a trailing one", () => {
		expect(buildSignInUrl("https://app.cliqrelay.com/")).toBe(
			"https://app.cliqrelay.com/auth/sign-in",
		);
	});
});

describe("isSessionCookieSet", () => {
	const sessionCookie = { name: COOKIE_CONSTANTS.session.name };

	test("should be true when the session cookie is written", () => {
		expect(isSessionCookieSet({ cookie: sessionCookie, removed: false })).toBe(
			true,
		);
	});

	test("should be false when the session cookie is removed", () => {
		expect(isSessionCookieSet({ cookie: sessionCookie, removed: true })).toBe(
			false,
		);
	});

	test("should be false for any other cookie", () => {
		expect(
			isSessionCookieSet({
				cookie: { name: COOKIE_CONSTANTS.csrf.name },
				removed: false,
			}),
		).toBe(false);
	});
});
