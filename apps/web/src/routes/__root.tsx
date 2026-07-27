import { useEffect } from "react";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/constants/query-client";
import { getActiveOrgCookie } from "@/lib/org-cookie";
import { getActiveTeamCookie, setActiveTeamCookie } from "@/lib/team-cookie";
import type { MyRouterContext } from "@/router";
import { getTeams } from "@/server-fns/teams";
import { useTeamStore } from "@/stores/team-store";
import TanStackQueryDevtools from "../integrations/tanstack-query/Devtools";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		try {
			const response = await getTeams();
			let teams = response.teams;

			let cookieHeader: string | undefined;
			if (import.meta.env.SSR) {
				try {
					const { getStartContext } = await import(
						"@tanstack/start-storage-context"
					);
					const ctx = getStartContext({ throwIfNotFound: false });
					cookieHeader = ctx?.request?.headers?.get("Cookie") ?? undefined;
				} catch {
					// Not in a server request context
				}
			}

			const activeOrgId = getActiveOrgCookie(cookieHeader);
			if (activeOrgId) {
				teams = teams.filter((team) => team.organizationId === activeOrgId);
			}

			const cookieTeamId = getActiveTeamCookie(cookieHeader);
			const isValid = teams.some((team) => team.id === cookieTeamId);
			const activeTeamId = isValid ? cookieTeamId! : (teams[0]?.id ?? null);

			if (!isValid && activeTeamId) {
				setActiveTeamCookie(activeTeamId);
			}

			useTeamStore.getState().setTeams(teams);
			if (activeTeamId) {
				useTeamStore.getState().setActiveTeam(activeTeamId);
			}

			return { teams, activeTeamId };
		} catch {
			return { teams: [], activeTeamId: null };
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
						teams?: Array<{ id: string; name: string; organizationId: string }>;
						activeTeamId?: string | null;
				  }
				| undefined;
		},
	});

	useEffect(() => {
		if (rootContext?.teams) {
			useTeamStore.getState().setTeams(rootContext.teams);
			if (rootContext.activeTeamId) {
				useTeamStore.getState().setActiveTeam(rootContext.activeTeamId);
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
