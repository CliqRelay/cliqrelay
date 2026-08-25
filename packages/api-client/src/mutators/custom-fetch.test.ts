import { afterEach, describe, expect, test, vi } from "vitest";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { customFetch, getCachedCsrfToken } from "./custom-fetch";

const CSRF_COOKIE = COOKIE_CONSTANTS.csrf.name;

const jsonResponse = (setCookie: string[]): Response =>
  ({
    ok: true,
    status: 200,
    headers: {
      getSetCookie: () => setCookie,
    },
    text: async () => JSON.stringify({ ok: true }),
  }) as unknown as Response;

describe("customFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("csrf token cache", () => {
    test("should not cache the token on the server", async () => {
      // Arrange — the vitest environment is node, so `window` is undefined
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => jsonResponse([`${CSRF_COOKIE}=server-token; Path=/`])),
      );

      // Act
      await customFetch("https://api.test/api/v1/health");

      // Assert — a module-level cache would leak this token across requests
      expect(getCachedCsrfToken()).toBeUndefined();
    });

    test("should cache the token in the browser", async () => {
      // Arrange
      vi.stubGlobal("window", {} as Window);
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => jsonResponse([`${CSRF_COOKIE}=browser-token; Path=/`])),
      );

      // Act
      await customFetch("https://api.test/api/v1/health");

      // Assert
      expect(getCachedCsrfToken()).toBe("browser-token");
    });
  });
});
