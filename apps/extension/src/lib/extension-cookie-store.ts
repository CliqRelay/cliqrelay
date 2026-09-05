import type { CookieStore } from "authula";
import { browser } from "wxt/browser";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { env } from "@/constants/env";

/**
 * The cookies the Authula SDK needs to read from an extension page.
 *
 * The session cookie is deliberately absent: it is HttpOnly, and it rides along
 * anyway because the SDK's fetch already sends `credentials: "include"`.
 */
const READ_COOKIE_NAMES = [COOKIE_CONSTANTS.csrf.name];

/**
 * Backs the Authula SDK's cookie store with `browser.cookies`.
 *
 * Without this the SDK falls back to `document.cookie`, which inside a
 * `chrome-extension://` page is the extension's own (empty) jar — so
 * `CSRFPlugin` would never find the token that lives on the API origin.
 *
 * `config.cookies()` is awaited on every request, so this factory can be async;
 * the returned `getAll()` is synchronous, hence reading up front and closing
 * over the result.
 */
export const createExtensionCookieStore = async (): Promise<CookieStore> => {
	const cookies = await Promise.all(
		READ_COOKIE_NAMES.map((name) =>
			browser.cookies.get({ url: env.VITE_API_URL, name }).catch(() => null),
		),
	);

	const entries = cookies.flatMap((cookie) =>
		cookie?.value ? [{ name: cookie.name, value: cookie.value }] : [],
	);

	// The extension never writes cookies — the API owns them.
	return { getAll: () => entries, set: () => {} };
};
