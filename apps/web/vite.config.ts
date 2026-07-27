import { defineConfig, type PluginOption } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import {
	rootRoute,
	index,
	route,
	type VirtualRootRoute,
} from "@tanstack/virtual-file-routes";

export async function buildVirtualRouteConfig(
	extend?: (routes: VirtualRootRoute) => void,
): Promise<VirtualRootRoute> {
	const routes = rootRoute("__root.tsx", [
		index("index.tsx"),
		route("/create-organization", "create-organization/index.tsx"),
		route("/dashboard", "dashboard/route.tsx", [
			index("dashboard/index.tsx"),
			route("/guides", "dashboard/guides/index.tsx"),
			route("/guides/$guideId", "dashboard/guides/$guideId.tsx"),
			route("/starred", "dashboard/starred/index.tsx"),
			route("/trash", "dashboard/trash/index.tsx"),
			route("/organizations", [
				route("/$orgId/settings", "dashboard/organizations/$orgId/settings/route.tsx", [
					index("dashboard/organizations/$orgId/settings/index.tsx"),
					route("/general", "dashboard/organizations/$orgId/settings/general/index.tsx"),
					route("/members", "dashboard/organizations/$orgId/settings/members/index.tsx"),
					route("/teams", "dashboard/organizations/$orgId/settings/teams/index.tsx"),
					route("/branding", "dashboard/organizations/$orgId/settings/branding/index.tsx"),
					route("/integrations", "dashboard/organizations/$orgId/settings/integrations/index.tsx"),
				]),
				route("/$orgId/teams/$teamId/settings", "dashboard/organizations/$orgId/teams/$teamId/settings/route.tsx", [
					index("dashboard/organizations/$orgId/teams/$teamId/settings/index.tsx"),
					route("/general", "dashboard/organizations/$orgId/teams/$teamId/settings/general/index.tsx"),
					route("/members", "dashboard/organizations/$orgId/teams/$teamId/settings/members/index.tsx"),
				]),
				route("/invitation", "dashboard/organizations/invitation/index.tsx"),
			]),
		]),
		route("/auth", "auth/route.tsx", [
			route("/sign-in", "auth/sign-in/index.tsx"),
			route("/sign-up", "auth/sign-up/index.tsx"),
			route("/reset-password", "auth/reset-password/index.tsx"),
			route("/change-password", "auth/change-password/index.tsx"),
			route("/email-verification", "auth/email-verification/index.tsx"),
		]),
	]);

	extend?.(routes);

	return routes;
}

export const virtualModulePlugin = () => ({
	name: "virtual:extensions",
	resolveId(id: string) {
		if (id === "virtual:extensions") {
			return "\0virtual:extensions";
		}
	},
	load(id: string) {
		if (id === "\0virtual:extensions") {
			return "";
		}
	},
})

export async function createPlugins(
	virtualRouteConfig: VirtualRootRoute,
): Promise<Record<string, PluginOption>> {
	return {
		devtools: devtools(),
		nitro: nitro({ rollupConfig: { external: [/^@sentry\//] } } as any),
		tailwindcss: tailwindcss(),
		tanstackStart: tanstackStart({
			router: {
				virtualRouteConfig,
			},
		}),
		viteReact: viteReact(),
		babel: babel({ presets: [reactCompilerPreset()] }),
		virtualExtensions: virtualModulePlugin(),
	};
}

export default defineConfig(async () => {
	const virtualRouteConfig = await buildVirtualRouteConfig();
	const pluginMap = await createPlugins(virtualRouteConfig);

	return {
		resolve: {
			tsconfigPaths: true,
		},
		plugins: Object.values(pluginMap),
		server: {
			host: "::",
			port: 3000,
			fs: {
				strict: false,
			},
		},
	};
});
