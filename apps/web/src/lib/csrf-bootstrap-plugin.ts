import type { AuthulaClient, Plugin } from "authula";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * The API mints `authula_csrf_token` as a side effect of a safe request, so the
 * browser only holds one once it has called the API itself. On a hard load of
 * an auth page every call is made during SSR, which leaves the browser without
 * the cookie and every CSRF protected POST — sign in, sign up, password reset —
 * failing with a 403 `missing csrf cookie`.
 *
 * Make one safe call first so the cookie is there when `CSRFPlugin` reads it.
 * This has to be registered before `CSRFPlugin`, hooks run in the order they
 * were registered.
 */
export class CSRFBootstrapPlugin implements Plugin {
	readonly id = "csrf-bootstrap";

	private priming: Promise<void> | null = null;

	init(client: AuthulaClient) {
		client.registerBeforeFetch(async (ctx) => {
			const method = (ctx.init.method ?? "GET").toUpperCase();
			if (SAFE_METHODS.has(method)) {
				return;
			}

			if (await client.getCookie(COOKIE_CONSTANTS.csrf.name)) {
				return;
			}

			await this.prime(client.config.url);
		});

		return {};
	}

	private prime(url: string): Promise<void> {
		if (!this.priming) {
			this.priming = fetch(`${url.replace(/\/+$/, "")}/me`, {
				method: "GET",
				credentials: "include",
			})
				.then(() => undefined)
				// Whatever went wrong here will go wrong again for the request that
				// triggered this, and that one can report it with context.
				.catch(() => undefined)
				.finally(() => {
					this.priming = null;
				});
		}

		return this.priming;
	}
}
