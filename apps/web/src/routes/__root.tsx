import {
	HeadContent,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { api } from "@repo/api-client";

import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/constants/query-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
	getActiveWorkspaceCookie,
	setActiveWorkspaceCookie,
} from "@/lib/workspace-cookie";
import TanStackQueryDevtools from "../integrations/tanstack-query/Devtools";
import type { MyRouterContext } from "@/router";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async ({ context }) => {
		if (!context.user) {
			return { activeWorkspaceId: null, workspaces: [] };
		}

		try {
			const response = await api.workspaces.getWorkspaces();
			const workspaces = (response.workspaces ?? []).map((ws: any) => ({
				id: ws.id,
				name: ws.name,
				type: ws.type,
			}));

			const cookieWorkspaceId = getActiveWorkspaceCookie();
			const isValid = workspaces.some((ws: any) => ws.id === cookieWorkspaceId);
			const activeWorkspaceId = isValid
				? cookieWorkspaceId!
				: (workspaces[0]?.id ?? null);

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
