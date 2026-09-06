import type { QueryClient } from "@tanstack/react-query";
import {
	createHashHistory,
	createRouter as createTanStackRouter,
} from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter(queryClient: QueryClient) {
	const hashHistory = createHashHistory();

	const router = createTanStackRouter({
		routeTree,
		history: hashHistory,
		// Route guards read the session through the query cache, so they need the
		// same client the React tree renders from.
		context: { queryClient },
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
