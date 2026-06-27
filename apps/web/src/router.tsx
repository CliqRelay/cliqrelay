import {
	createRouter as createTanStackRouter,
	Link,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import type { QueryClient } from "@tanstack/react-query";
import type { User } from "authula";

import { extensionRegistry } from "@repo/extension-api";

import { getContext } from "./integrations/tanstack-query/RootProvider";
import { routeTree } from "./routeTree.gen";

await import("virtual:extensions");
extensionRegistry.freeze();

export interface MyRouterContext {
	queryClient: QueryClient;
	user: User | null;
	hideSiteHeader?: boolean;
}

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: false,
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: () => {
			return (
				<div className="min-h-screen flex items-center justify-center bg-gray-100">
					<div className="text-center">
						<h1 className="text-4xl font-bold mb-4">404</h1>
						<p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
						<Link to="/">Go home</Link>
					</div>
				</div>
			);
		},
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
