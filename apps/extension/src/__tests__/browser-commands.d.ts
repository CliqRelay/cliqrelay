import "vitest/browser";

declare module "vitest/browser" {
  interface BrowserCommands {
    movePointer: (x: number, y: number) => Promise<void>;
  }
}
