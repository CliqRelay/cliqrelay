import type { StorybookConfig } from "@storybook/react-vite";

import { resolve } from "node:path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-vitest"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    // WXT owns the app's Vite config, so Storybook cannot extend it. Wire the
    // pieces the extension relies on by hand.
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@": resolve(import.meta.dirname, "../src"),
      },
    };
    config.plugins = config.plugins ?? [];
    config.plugins.push(tailwindcss());
    return config;
  },
};
export default config;
