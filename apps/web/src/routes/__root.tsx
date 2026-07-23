import {
	HeadContent,
	Scripts,
	createRootRouteWithContext,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/constants/query-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
	getActiveWorkspaceCookie,
	setActiveWorkspaceCookie,
} from "@/lib/workspace-cookie";
import { getWorkspaces } from "@/server-fns/workspaces";
import TanStackQueryDevtools from "../integrations/tanstack-query/Devtools";
import type { MyRouterContext } from "@/router";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		try {
			const response = await getWorkspaces();
			const workspaces = response.workspaces;

			const cookieWorkspaceId = getActiveWorkspaceCookie();
			const isValid = workspaces.some(
				(workspace) => workspace.id === cookieWorkspaceId,
			);
			const activeWorkspaceId = isValid
				? cookieWorkspaceId!
				: (workspaces.find((workspace) => workspace.type === "personal")?.id ??
					workspaces[0]?.id ??
					null);

			if (!isValid && activeWorkspaceId) {
				setActiveWorkspaceCookie(activeWorkspaceId);
			}

			useWorkspaceStore.getState().setWorkspaces(workspaces);
			if (activeWorkspaceId) {
				useWorkspaceStore.getState().setActiveWorkspace(activeWorkspaceId);
			}

			return { workspaces, activeWorkspaceId };
		} catch {
			return { workspaces: [], activeWorkspaceId: null };
		}
	},
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "CliqRelay" },
			{
				name: "description",
				content:
					"CliqRelay is an open-source platform that transforms page clicks and interactions into beautiful, step-by-step visual documentation. " +
					"Capture and refine workflows instantly to help your teams perform at their best.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "favicon",
				href: "/favicon.ico",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const rootContext = useRouterState({
		select: (state) => {
			const root = state.matches.find((m) => m.routeId === "__root__");
			return root?.context as
				| {
						workspaces?: Array<{ id: string; name: string; type: string }>;
						activeWorkspaceId?: string | null;
				  }
				| undefined;
		},
	});

	useEffect(() => {
		if (rootContext?.workspaces) {
			useWorkspaceStore.getState().setWorkspaces(rootContext.workspaces as any);
			if (rootContext.activeWorkspaceId) {
				useWorkspaceStore
					.getState()
					.setActiveWorkspace(rootContext.activeWorkspaceId);
			}
		}
	}, [rootContext]);

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					<TooltipProvider>
						<QueryClientProvider client={queryClient}>
							{children}
						</QueryClientProvider>
					</TooltipProvider>
				</ThemeProvider>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Toaster />
				<Scripts />
			</body>
		</html>
	);
}
