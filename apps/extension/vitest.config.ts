import type { BrowserCommand } from "vitest/node";

import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": resolve(import.meta.dirname, "./src"),
};

const movePointer: BrowserCommand<[x: number, y: number]> = async (context, x, y) => {
  if (context.provider.name !== "playwright") {
    throw new Error("movePointer requires the playwright provider");
  }
  const frameBox = await (
    await context.frame()
  )
    .frameElement()
    .then((frame) => frame.boundingBox());
  await context.page.mouse.move((frameBox?.x ?? 0) + x, (frameBox?.y ?? 0) + y);
};

const pressPointer: BrowserCommand<[]> = async (context) => {
  await context.page.mouse.down();
};

const releasePointer: BrowserCommand<[]> = async (context) => {
  await context.page.mouse.up();
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.browser.test.ts"],
          setupFiles: ["src/__tests__/setup.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            commands: { movePointer, pressPointer, releasePointer },
          },
        },
      },
    ],
  },
});
