import {
	getCookies,
	getRequestProtocol,
	getResponse,
	setCookie,
} from "@tanstack/react-start/server";
import type { CookieAttributes, CookieStore } from "authula";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { envServer } from "@/constants/env-server";

/**
 * Cookies we relay from an Authula response back to the browser during SSR.
 *
 * Only the CSRF token is relayed. The session cookie is deliberately excluded:
 * SSR talks to the API over the internal origin, so a relayed session cookie
 * would be scoped to the web app's host and end up as a second, differently
 * scoped copy alongside the one the browser already holds from the API host.
 * The API reads whichever it sees first, so the duplicate is worse than the
 * dropped refresh.
 */
const RELAYED_COOKIE_NAMES: ReadonlySet<string> = new Set([
	COOKIE_CONSTANTS.csrf.name,
]);

const NOOP_STORE: CookieStore = {
	getAll: () => [],
	set: () => {},
};

/**
 * Bridges the Authula SDK's cookie store to the current SSR request/response.
 *
 * Reading was already wired up; writing was a no-op, which is why a hard load
 * of an auth page never left the browser with a CSRF cookie. The API mints
 * `authula_csrf_token` on any GET that arrives without one — including the
 * 401 session check — and the SDK hands us every `Set-Cookie` it parses, so
 * relaying them here is what puts the token in front of the browser.
 */
export const createSsrCookieStore = (): CookieStore => {
	try {
		// Probe the request context up front so a missing one degrades to a no-op
		// store rather than throwing on first use.
		getCookies();

		return {
			getAll: getRequestAndStagedCookies,
			set: relayCookieToResponse,
		};
	} catch {
		// Not inside a request context (e.g. prerender).
		return NOOP_STORE;
	}
};

/**
 * The cookies to forward upstream: those the browser sent, plus anything we
 * have already staged on the response during this request.
 *
 * One SSR render makes several Authula calls (the root route's session check,
 * then the auth route's). Without the staged half, each of them would reach the
 * API with no CSRF cookie, the API would mint a fresh token for every one, and
 * the response would carry a pile of competing `Set-Cookie` headers. Staged
 * values win, since they are newer than the request.
 */
const getRequestAndStagedCookies = (): Array<{
	name: string;
	value: string;
}> => {
	try {
		const cookies = new Map(Object.entries(getCookies()));

		for (const [name, value] of getStagedResponseCookies()) {
			cookies.set(name, value);
		}

		return Array.from(cookies, ([name, value]) => ({ name, value }));
	} catch {
		return [];
	}
};

const getStagedResponseCookies = (): Array<[string, string]> => {
	try {
		return getResponse()
			.headers.getSetCookie()
			.flatMap((setCookieHeader) => {
				const [pair] = setCookieHeader.split(";");
				const separatorIndex = pair?.indexOf("=") ?? -1;
				if (!pair || separatorIndex < 1) return [];

				const name = pair.slice(0, separatorIndex).trim();
				const value = pair.slice(separatorIndex + 1).trim();
				return RELAYED_COOKIE_NAMES.has(name)
					? [[name, value] as [string, string]]
					: [];
			});
	} catch {
		// Response not available in this context.
		return [];
	}
};

const relayCookieToResponse = (
	name: string,
	value: string,
	options?: CookieAttributes,
): void => {
	if (!RELAYED_COOKIE_NAMES.has(name)) return;

	try {
		setCookie(name, value, {
			path: options?.path,
			expires: options?.expires,
			maxAge: options?.maxAge,
			sameSite: options?.sameSite,
			httpOnly: options?.httpOnly ?? false,
			// Authula derives `secure` from `Request.URL.Scheme`, which is always
			// empty on a Go server, so the upstream value is always false. Derive it
			// from the request the browser actually made instead.
			secure: getRequestProtocol() === "https",
			// The upstream domain describes the internal API origin and would be
			// meaningless to the browser. Web and API are separate hostnames in
			// production, so the cookie needs the shared parent domain to be both
			// readable by the browser and sent back to the API.
			domain: envServer.authCookieDomain,
		});
	} catch {
		// Response headers already sent, or no request context.
	}
};
