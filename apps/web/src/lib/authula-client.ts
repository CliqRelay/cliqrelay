import type { ClientWithPlugins } from "authula";
import type { CSRFPlugin, EmailPasswordPlugin } from "authula/plugins";

let _client: ClientWithPlugins<readonly [EmailPasswordPlugin, CSRFPlugin]>;

// Vite replaces import.meta.env.SSR at compile time:
// - Client build: false → browser branch, server branch tree-shaken
// - SSR build: true → server branch, browser branch tree-shaken
if (import.meta.env.SSR) {
	const { authulaServerClient: authulaClient } = await import(
		"./authula-client-server"
	);
	_client = authulaClient;
} else {
	const { authulaBrowserClient: authulaClient } = await import(
		"./authula-client-browser"
	);
	_client = authulaClient;
}

export const authulaClient = _client;
