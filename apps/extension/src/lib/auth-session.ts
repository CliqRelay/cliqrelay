import { COOKIE_CONSTANTS } from "@repo/data-commons";

/**
 * The web app page the side panel sends signed-out users to.
 *
 * Sign-in has to happen on the web app so the session cookie lands on the API
 * origin — see the sign-in route for the full reasoning.
 */
export const buildSignInUrl = (webUrl: string): string =>
	`${webUrl.replace(/\/+$/, "")}/auth/sign-in`;

export type SessionCookieChange = {
	cookie: { name: string };
	removed: boolean;
};

/**
 * True when a `browser.cookies.onChanged` event means the session cookie was
 * just written — i.e. the user finished signing in on the web app.
 */
export const isSessionCookieSet = (change: SessionCookieChange): boolean =>
	!change.removed && change.cookie.name === COOKIE_CONSTANTS.session.name;
