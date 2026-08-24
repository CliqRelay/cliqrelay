import type { AuthulaClient, BeforeFetchHook, FetchContext } from "authula";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CSRFBootstrapPlugin } from "./csrf-bootstrap-plugin";

vi.mock("@repo/data-commons", () => ({
	COOKIE_CONSTANTS: { csrf: { name: "authula_csrf_token" } },
}));

const AUTHULA_URL = "http://api.test/api/v1/auth";

function setup(cookies: Record<string, string> = {}) {
	const hooks: Array<BeforeFetchHook> = [];

	const client = {
		config: { url: AUTHULA_URL },
		registerBeforeFetch: (hook: BeforeFetchHook) => {
			hooks.push(hook);
		},
		getCookie: async (name: string) => cookies[name],
	} as unknown as AuthulaClient;

	new CSRFBootstrapPlugin().init(client);

	return { beforeFetch: hooks[0] };
}

function request(method: string): FetchContext {
	return {
		url: `${AUTHULA_URL}/email-password/sign-in`,
		init: { method },
		meta: {},
	};
}

function deferredResponse() {
	let resolve!: () => void;
	const settled = new Promise<void>((r) => {
		resolve = r;
	});
	const fetchMock = vi.fn(() => settled.then(() => new Response(null)));
	vi.stubGlobal("fetch", fetchMock);
	return { fetchMock, resolve };
}

describe("CSRFBootstrapPlugin", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	test("should leave safe requests alone", async () => {
		const { fetchMock } = deferredResponse();
		const { beforeFetch } = setup();

		await beforeFetch(request("GET"));
		await beforeFetch(request("HEAD"));
		await beforeFetch(request("OPTIONS"));

		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("should fetch the cookie before an unsafe request without one", async () => {
		const { fetchMock, resolve } = deferredResponse();
		const { beforeFetch } = setup();

		const pending = beforeFetch(request("POST"));
		resolve();
		await pending;

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(`${AUTHULA_URL}/me`, {
			method: "GET",
			credentials: "include",
		});
	});

	test("should skip the fetch when the cookie is already there", async () => {
		const { fetchMock } = deferredResponse();
		const { beforeFetch } = setup({ authula_csrf_token: "token" });

		await beforeFetch(request("POST"));

		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("should share one fetch between concurrent unsafe requests", async () => {
		const { fetchMock, resolve } = deferredResponse();
		const { beforeFetch } = setup();

		const pending = Promise.all([
			beforeFetch(request("POST")),
			beforeFetch(request("PATCH")),
		]);
		resolve();
		await pending;

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test("should fetch again once the previous attempt has finished", async () => {
		const { fetchMock, resolve } = deferredResponse();
		const { beforeFetch } = setup();

		const first = beforeFetch(request("POST"));
		resolve();
		await first;
		await beforeFetch(request("POST"));

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	test("should not swallow the request when the fetch fails", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		const { beforeFetch } = setup();

		await expect(beforeFetch(request("POST"))).resolves.toBeUndefined();
	});
});
