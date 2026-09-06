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
  cause: string;
};

const isSessionCookie = (change: SessionCookieChange): boolean =>
  change.cookie.name === COOKIE_CONSTANTS.session.name;

/**
 * True when a `browser.cookies.onChanged` event means the session cookie was
 * just written — i.e. the user finished signing in on the web app.
 */
export const isSessionCookieSet = (change: SessionCookieChange): boolean =>
  !change.removed && isSessionCookie(change);

/**
 * True when the session cookie went away — a sign-out in the web app, or a
 * session that expired.
 *
 * The `"overwrite"` cause is deliberately excluded. The browser reports every
 * rewrite of a cookie as a removal followed by an insert, so a routine session
 * refresh looks identical to a sign-out without this check. A real sign-out
 * replaces the cookie with an already-expired one, which reports as
 * `"expired_overwrite"` instead.
 */
export const isSessionCookieCleared = (change: SessionCookieChange): boolean =>
  change.removed && isSessionCookie(change) && change.cause !== "overwrite";
