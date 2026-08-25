import { toCamelCaseKeys, toSnakeCaseKeys } from "es-toolkit";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

/**
 * Custom HTTP client used by Orval-generated fetch functions.
 * Returns the resolved data for every response or throws an error.
 *
 * Handles bidirectional key conversion:
 * - Outgoing request bodies are converted from camelCase → snake_case
 *   to match the Go API's expected format.
 * - Incoming response bodies are converted from snake_case → camelCase
 *   to match the generated TypeScript types.
 */

const CSRF_COOKIE_NAME = COOKIE_CONSTANTS.csrf.name;

// Browser-only. On the server this module is a process singleton shared by
// every concurrent SSR request, so caching a token here would let one user's
// token be attached to another user's request. Server-side callers always pass
// an explicit cookie header instead.
const isBrowser = (): boolean => typeof window !== "undefined";

let cachedCsrfToken: string | undefined;

function extractCsrfFromSetCookieHeaders(headers: Headers): void {
  if (!isBrowser()) return;

  try {
    const setCookie = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    for (const cookie of setCookie) {
      const match = cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`));
      if (match) {
        cachedCsrfToken = match[1];
        return;
      }
    }
  } catch {
    // headers API not available in this environment
  }
}

export function getCachedCsrfToken(): string | undefined {
  return isBrowser() ? cachedCsrfToken : undefined;
}

// A dedicated error class makes it easy to type check and handle in UI layers
export class ApiError extends Error {
  status: number;
  data: any;
  headers: Headers;

  constructor(message: string, status: number, data: any, headers: Headers) {
    super(message || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.headers = headers;
  }
}

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  // Server-side (SSR in Docker): use internal API_URL to reach the api container
  const resolvedUrl =
    typeof window === "undefined" && typeof process !== "undefined" && process.env?.API_URL
      ? url.replace(/^https?:\/\/[^/]+/, process.env.API_URL.replace(/\/+$/, ""))
      : url;

  const body = convertRequestBodyToSnakeCase(options?.body);

  const res = await fetch(resolvedUrl, { ...options, body });

  extractCsrfFromSetCookieHeaders(res.headers);

  const responseBody = [204, 205, 304].includes(res.status) ? null : await res.text();

  const parsed: any = responseBody ? JSON.parse(responseBody) : {};
  const camelCasedData = toCamelCaseKeys(parsed);

  const message =
    typeof camelCasedData === "object" && camelCasedData !== null && "message" in camelCasedData
      ? String(camelCasedData.message)
      : "";

  if (!res.ok) {
    throw new ApiError(message, res.status, camelCasedData, res.headers);
  }

  return camelCasedData as T;
};

function convertRequestBodyToSnakeCase(
  body: BodyInit | null | undefined,
): BodyInit | null | undefined {
  if (typeof body !== "string") {
    return body;
  }

  try {
    const parsed = JSON.parse(body);
    if (parsed !== null && typeof parsed === "object") {
      return JSON.stringify(toSnakeCaseKeys(parsed));
    }
    return body;
  } catch {
    return body;
  }
}
