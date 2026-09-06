import { describe, expect, test } from "vitest";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import {
  buildSignInUrl,
  isSessionCookieCleared,
  isSessionCookieSet,
  type SessionCookieChange,
} from "./auth-session";

const buildChange = (overrides: Partial<SessionCookieChange> = {}): SessionCookieChange => ({
  cookie: { name: COOKIE_CONSTANTS.session.name },
  removed: false,
  cause: "explicit",
  ...overrides,
});

describe("buildSignInUrl", () => {
  test("should point at the web app's sign-in page", () => {
    expect(buildSignInUrl("http://localhost:3000")).toBe("http://localhost:3000/auth/sign-in");
  });

  test("should not double the slash when the web url has a trailing one", () => {
    expect(buildSignInUrl("https://app.cliqrelay.com/")).toBe(
      "https://app.cliqrelay.com/auth/sign-in",
    );
  });
});

describe("isSessionCookieSet", () => {
  test("should be true when the session cookie is written", () => {
    expect(isSessionCookieSet(buildChange())).toBe(true);
  });

  test("should be false when the session cookie is removed", () => {
    expect(isSessionCookieSet(buildChange({ removed: true }))).toBe(false);
  });

  test("should be false for any other cookie", () => {
    expect(isSessionCookieSet(buildChange({ cookie: { name: COOKIE_CONSTANTS.csrf.name } }))).toBe(
      false,
    );
  });
});

describe("isSessionCookieCleared", () => {
  test("should be true when the web app signs the user out", () => {
    expect(isSessionCookieCleared(buildChange({ removed: true, cause: "expired_overwrite" }))).toBe(
      true,
    );
  });

  test("should be true when the session cookie expires on its own", () => {
    expect(isSessionCookieCleared(buildChange({ removed: true, cause: "expired" }))).toBe(true);
  });

  test("should be true when the cookie is deleted explicitly", () => {
    expect(isSessionCookieCleared(buildChange({ removed: true, cause: "explicit" }))).toBe(true);
  });

  test("should be false for the removal half of a session refresh", () => {
    expect(isSessionCookieCleared(buildChange({ removed: true, cause: "overwrite" }))).toBe(false);
  });

  test("should be false when the cookie is written rather than removed", () => {
    expect(isSessionCookieCleared(buildChange())).toBe(false);
  });

  test("should be false for any other cookie", () => {
    expect(
      isSessionCookieCleared(
        buildChange({
          cookie: { name: COOKIE_CONSTANTS.csrf.name },
          removed: true,
          cause: "explicit",
        }),
      ),
    ).toBe(false);
  });
});
