import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  "@": path.resolve(__dirname, "./src"),
};

export default defineConfig({
  test: {
    reporters: ["verbose"],
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "unit",
          globals: true,
          environment: "node",
          dir: "./src",
        },
        resolve: { alias },
      },
      {
        plugins: [storybookTest({ configDir: path.resolve(__dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
        resolve: { alias },
      },
    ],
  },
});
