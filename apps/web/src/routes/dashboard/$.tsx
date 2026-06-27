import { type ComponentType, useMemo } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";

import { extensionRegistry } from "@repo/extension-api";

export const Route = createFileRoute("/dashboard/$")({
	loader: async ({ params, context, abortController }) => {
		const route = extensionRegistry.resolveRoute(params._splat ?? "");
		if (!route?.loader) {
			return { data: null };
		}

		const data = await route.loader({
			params: {},
			context: context as Record<string, unknown>,
			abortController,
		});

		return { data };
	},
	pendingComponent: PendingFallback,
	errorComponent: ErrorFallback,
	notFoundComponent: NotFoundFallback,
	component: DashboardCatchAll,
});

function PendingFallback() {
	return (
		<div className="p-6 text-sm text-muted-foreground animate-pulse">
			Loading...
		</div>
	);
}

function ErrorFallback({ error }: { error: Error }) {
	return (
		<div className="p-6">
			<h2 className="text-lg font-bold text-red-600">Error</h2>
			<p className="text-sm text-muted-foreground">{error.message}</p>
			<Link to="/dashboard" className="mt-2 inline-block text-sm underline">
				Back to Dashboard
			</Link>
		</div>
	);
}

function NotFoundFallback() {
	return (
		<div className="flex min-h-96 items-center justify-center">
			<div className="text-center">
				<h1 className="mb-4 text-4xl font-bold">404</h1>
				<p className="mb-4 text-xl text-muted-foreground">Page not found</p>
				<Link to="/dashboard" className="text-sm underline">
					Go to Dashboard
				</Link>
			</div>
		</div>
	);
}

function DashboardCatchAll() {
	const { _splat } = Route.useParams();
	const { data } = Route.useLoaderData();

	const routeConfig = useMemo(
		() => extensionRegistry.resolveRoute(_splat ?? ""),
		[_splat],
	);

	if (!routeConfig) {
		return <NotFoundFallback />;
	}

	const Component = routeConfig.component as ComponentType<
		Record<string, unknown>
	>;
	return <Component {...(data ?? {})} />;
}
