import { defineConfig } from "wxt";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "./src",
  modules: [],
  outDir: "./dist",
  webExt: {
    disabled: true,
  },
  dev: {
    server: {
      host: "127.0.0.1",
      port: 3002, // Make sure this matches with VITE_PORT in .env
    }
  },
  vite: () => {
    return {
      plugins: [
        devtools(),
        tailwindcss(),
        tanstackRouter({
          framework: "react",
          routesDirectory: "./src/entrypoints/sidepanel/routes",
          generatedRouteTree: "./src/entrypoints/sidepanel/routeTree.gen.ts",
          autoCodeSplitting: true,
        }),
        viteReact(),
      ],
    }
  },
  manifest: () => {
    const port = import.meta.env.VITE_PORT;

    return {
      permissions: ["cookies", "storage", "activeTab", "tabs", "scripting", "webNavigation", "offscreen"],
      host_permissions: ["<all_urls>"],
      name: "CliqRelay Extension",
      description:
        "Capture cursor, clicks, and navigation from any tab into CliqRelay",
      action: {},
      content_security_policy: {
        extension_pages:
          `script-src 'self' http://127.0.0.1:${port}; object-src 'self'`,
      },
      externally_connectable: {
        matches: [
          "http://localhost/*",
          "http://host.docker.internal/*",
        ]
      },
      web_accessible_resources: [
        {
          resources: ["offscreen.html"],
          matches: ["<all_urls>"],
        },
      ],
    }
  },
});
