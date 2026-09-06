import { COOKIE_CONSTANTS } from "@repo/data-commons";

export const buildSignInUrl = (webUrl: string): string =>
  `${webUrl.replace(/\/+$/, "")}/auth/sign-in`;

export type SessionCookieChange = {
  cookie: { name: string };
  removed: boolean;
  cause: string;
};

const isSessionCookie = (change: SessionCookieChange): boolean =>
  change.cookie.name === COOKIE_CONSTANTS.session.name;

export const isSessionCookieSet = (change: SessionCookieChange): boolean =>
  !change.removed && isSessionCookie(change);

export const isSessionCookieCleared = (change: SessionCookieChange): boolean =>
  change.removed && isSessionCookie(change) && change.cause !== "overwrite";
