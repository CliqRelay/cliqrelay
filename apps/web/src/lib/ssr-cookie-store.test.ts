import {
	getCookies,
	getRequestProtocol,
	getResponse,
	setCookie,
} from "@tanstack/react-start/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createSsrCookieStore } from "./ssr-cookie-store";

vi.mock("@tanstack/react-start/server", () => ({
	getCookies: vi.fn(),
	getRequestProtocol: vi.fn(),
	getResponse: vi.fn(),
	setCookie: vi.fn(),
}));

vi.mock("@repo/data-commons", () => ({
	COOKIE_CONSTANTS: { csrf: { name: "authula_csrf_token" } },
}));

const { envServerMock } = vi.hoisted(() => ({
	envServerMock: { authCookieDomain: undefined as string | undefined },
}));

vi.mock("@/constants/env-server", () => ({
	envServer: envServerMock,
}));

const stageResponseCookies = (setCookieHeaders: string[]): void => {
	vi.mocked(getResponse).mockReturnValue({
		headers: { getSetCookie: () => setCookieHeaders },
	} as unknown as ReturnType<typeof getResponse>);
};

const CSRF_COOKIE = "authula_csrf_token";
const SESSION_COOKIE = "authula.session_token";

describe("SsrCookieStore", () => {
	beforeEach(() => {
		vi.mocked(getCookies).mockReturnValue({});
		vi.mocked(getRequestProtocol).mockReturnValue("http");
		stageResponseCookies([]);
		envServerMock.authCookieDomain = undefined;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("getAll", () => {
		test("should return the request cookies as name/value pairs", () => {
			// Arrange
			vi.mocked(getCookies).mockReturnValue({
				[CSRF_COOKIE]: "token-1",
				[SESSION_COOKIE]: "session-1",
			});

			// Act
			const cookies = createSsrCookieStore().getAll();

			// Assert
			expect(cookies).toEqual([
				{ name: CSRF_COOKIE, value: "token-1" },
				{ name: SESSION_COOKIE, value: "session-1" },
			]);
		});

		test("should preserve values containing an equals sign", () => {
			// Arrange
			vi.mocked(getCookies).mockReturnValue({
				[SESSION_COOKIE]: "YWJjZGVm==",
			});

			// Act
			const cookies = createSsrCookieStore().getAll();

			// Assert
			expect(cookies).toEqual([{ name: SESSION_COOKIE, value: "YWJjZGVm==" }]);
		});

		test("should include a csrf cookie already staged on the response", () => {
			// Arrange — an earlier Authula call in this same render already relayed one
			vi.mocked(getCookies).mockReturnValue({ [SESSION_COOKIE]: "session-1" });
			stageResponseCookies([
				`${CSRF_COOKIE}=staged-token; Path=/; Max-Age=86400; SameSite=Lax`,
			]);

			// Act
			const cookies = createSsrCookieStore().getAll();

			// Assert
			expect(cookies).toContainEqual({
				name: CSRF_COOKIE,
				value: "staged-token",
			});
		});

		test("should prefer the staged csrf cookie over the one the browser sent", () => {
			// Arrange
			vi.mocked(getCookies).mockReturnValue({ [CSRF_COOKIE]: "stale-token" });
			stageResponseCookies([`${CSRF_COOKIE}=fresh-token; Path=/`]);

			// Act
			const cookies = createSsrCookieStore().getAll();

			// Assert — one entry only, and it is the newer value
			expect(cookies).toEqual([{ name: CSRF_COOKIE, value: "fresh-token" }]);
		});

		test("should ignore staged cookies outside the allowlist", () => {
			// Arrange
			stageResponseCookies([`${SESSION_COOKIE}=leaked; Path=/`]);

			// Act
			const cookies = createSsrCookieStore().getAll();

			// Assert
			expect(cookies).toEqual([]);
		});

		test("should return an empty list when there is no request context", () => {
			// Arrange
			vi.mocked(getCookies).mockImplementation(() => {
				throw new Error("No request context");
			});

			// Act
			const cookies = createSsrCookieStore().getAll();

			// Assert
			expect(cookies).toEqual([]);
		});
	});

	describe("set", () => {
		test("should relay the csrf cookie to the response", () => {
			// Arrange
			const store = createSsrCookieStore();

			// Act
			store.set(CSRF_COOKIE, "token-1", {
				path: "/",
				maxAge: 86400,
				sameSite: "lax",
				httpOnly: false,
			});

			// Assert
			expect(setCookie).toHaveBeenCalledWith(
				CSRF_COOKIE,
				"token-1",
				expect.objectContaining({
					path: "/",
					maxAge: 86400,
					sameSite: "lax",
					httpOnly: false,
				}),
			);
		});

		test("should not relay cookies outside the allowlist", () => {
			// Arrange
			const store = createSsrCookieStore();

			// Act
			store.set(SESSION_COOKIE, "session-1", { path: "/", httpOnly: true });

			// Assert
			expect(setCookie).not.toHaveBeenCalled();
		});

		test("should discard the upstream domain when none is configured", () => {
			// Arrange
			const store = createSsrCookieStore();

			// Act
			store.set(CSRF_COOKIE, "token-1", { domain: "api" });

			// Assert
			expect(setCookie).toHaveBeenCalledWith(
				CSRF_COOKIE,
				"token-1",
				expect.objectContaining({ domain: undefined }),
			);
		});

		test("should stamp the configured domain in place of the upstream one", () => {
			// Arrange
			envServerMock.authCookieDomain = ".example.com";
			const store = createSsrCookieStore();

			// Act
			store.set(CSRF_COOKIE, "token-1", { domain: "api" });

			// Assert
			expect(setCookie).toHaveBeenCalledWith(
				CSRF_COOKIE,
				"token-1",
				expect.objectContaining({ domain: ".example.com" }),
			);
		});

		test("should mark the cookie secure over https regardless of the upstream flag", () => {
			// Arrange
			vi.mocked(getRequestProtocol).mockReturnValue("https");
			const store = createSsrCookieStore();

			// Act
			store.set(CSRF_COOKIE, "token-1", { secure: false });

			// Assert
			expect(setCookie).toHaveBeenCalledWith(
				CSRF_COOKIE,
				"token-1",
				expect.objectContaining({ secure: true }),
			);
		});

		test("should not mark the cookie secure over http", () => {
			// Arrange
			const store = createSsrCookieStore();

			// Act
			store.set(CSRF_COOKIE, "token-1", { secure: true });

			// Assert
			expect(setCookie).toHaveBeenCalledWith(
				CSRF_COOKIE,
				"token-1",
				expect.objectContaining({ secure: false }),
			);
		});

		test("should swallow errors when the response is no longer writable", () => {
			// Arrange
			vi.mocked(setCookie).mockImplementation(() => {
				throw new Error("Headers already sent");
			});
			const store = createSsrCookieStore();

			// Act & Assert
			expect(() => store.set(CSRF_COOKIE, "token-1")).not.toThrow();
		});

		test("should be a no-op when there is no request context", () => {
			// Arrange
			vi.mocked(getCookies).mockImplementation(() => {
				throw new Error("No request context");
			});
			const store = createSsrCookieStore();

			// Act
			store.set(CSRF_COOKIE, "token-1");

			// Assert
			expect(setCookie).not.toHaveBeenCalled();
		});
	});
});
