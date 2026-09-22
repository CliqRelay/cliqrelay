import { describe, expect, test, vi } from "vitest";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { isActiveTeamCookieChanged } from "./active-team";
import type { CookieChange } from "./auth-session";

vi.mock("wxt/browser", () => ({ browser: {} }));

const buildChange = (overrides: Partial<CookieChange> = {}): CookieChange => ({
  cookie: { name: COOKIE_CONSTANTS.activeTeamId.name },
  removed: false,
  cause: "explicit",
  ...overrides,
});

describe("isActiveTeamCookieChanged", () => {
  test("should be true when the web app selects a team", () => {
    expect(isActiveTeamCookieChanged(buildChange())).toBe(true);
  });

  test("should be true when the web app clears the team on an org switch", () => {
    expect(
      isActiveTeamCookieChanged(buildChange({ removed: true, cause: "expired_overwrite" })),
    ).toBe(true);
  });

  test("should be true when the cookie is deleted explicitly", () => {
    expect(isActiveTeamCookieChanged(buildChange({ removed: true, cause: "explicit" }))).toBe(true);
  });

  test("should be false for the removal half of a team rewrite", () => {
    expect(isActiveTeamCookieChanged(buildChange({ removed: true, cause: "overwrite" }))).toBe(
      false,
    );
  });

  test.each([
    COOKIE_CONSTANTS.session.name,
    COOKIE_CONSTANTS.csrf.name,
    COOKIE_CONSTANTS.activeOrgId.name,
  ])("should be false for the %s cookie", (name) => {
    expect(isActiveTeamCookieChanged(buildChange({ cookie: { name } }))).toBe(false);
  });
});
