import { defineConfig, type UserManifest } from "wxt";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

export default defineConfig({
  manifestVersion: 3,
  srcDir: "./src",
  modules: [],
  outDir: "./dist",
  webExt: {
    disabled: true,
  },
  dev: {
    server: {
      host: "127.0.0.1",
      port: 3002,
    },
  },
  vite: () => {
    const port = import.meta.env.VITE_PORT || "3002";
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
      server: {
        port: parseInt(port),
      },
    };
  },
  manifest: ({ browser, command }) => {
    const port = import.meta.env.VITE_PORT || "3002";
    const isChrome = browser === "chrome";
    const isFirefox = browser === "firefox";

    const permissions: string[] = [
      "cookies",
      "storage",
      "activeTab",
      "tabs",
      "webNavigation",
    ];

    if (isChrome) {
      permissions.push("scripting", "offscreen", "sidePanel");
    } else if (isFirefox) {
      permissions.push("webRequest");
    }

    const webAccessibleResources = isChrome
      ? [
        {
          resources: ["offscreen.html"],
          matches: ["<all_urls>"],
        },
      ]
      : [];

    // 🔒 Dynamic Content Security Policy Resolution Strategy
    // Firefox blocks localhost in MV3 builds unless it's explicitly running as a temporary live add-on.
    // In production compilation modes, we strip localhost to satisfy Firefox's native schema linter completely.
    const extensionPagesCSP =
      command === "serve"
        ? `script-src 'self' http://127.0.0.1:${port}; object-src 'self'`
        : "script-src 'self'; object-src 'self'";

    const baseConfig: UserManifest = {
      version: "0.1.0",
      permissions,
      host_permissions: ["<all_urls>"],
      name: "CliqRelay Extension",
      description: "Capture cursor, clicks, and navigation from any tab into CliqRelay",
      action: {},
      content_security_policy: {
        extension_pages: extensionPagesCSP,
        // ⚠️ Notice: "sandbox" property is completely omitted here.
        // It's manually attached below ONLY if the compilation target is Chromium/Chrome.
      },
      ...(webAccessibleResources.length > 0 && { web_accessible_resources: webAccessibleResources }),
    };

    if (isChrome) {
      return {
        ...baseConfig,
        content_security_policy: {
          ...baseConfig.content_security_policy,
          // Safely attach sandbox properties exclusively for Chrome engines
          sandbox: "sandbox allow-scripts; script-src 'self' 'unsafe-eval';",
        },
        side_panel: {
          default_path: "sidepanel.html",
        },
        externally_connectable: {
          matches: [
            "http://localhost/*",
            "http://host.docker.internal/*",
          ],
        },
      };
    } else {
      return {
        ...baseConfig,
        // Firefox Manifest V3 strictly requires an explicit id block inside browser_specific_settings 
        // to load sidebar panels without crashing or breaking development lifecycle anchors.
        browser_specific_settings: {
          gecko: {
            id: "cliqrelay-extension@cliqrelay.com",
            strict_min_version: "109.0",
          },
        },
        sidebar_action: {
          default_title: "CliqRelay",
          default_panel: "sidepanel.html",
          default_icon: {
            "16": "icon/16.png",
            "48": "icon/48.png",
            "96": "icon/96.png",
          },
          open_at_install: false,
        },
      };
    }
  },
});
