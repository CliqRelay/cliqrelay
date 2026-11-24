type LegacyCleanupModule = {
  runLegacyCleanup: () => Promise<void>;
};

type ModuleLoader = () => Promise<LegacyCleanupModule>;

type GlobModules = Record<string, ModuleLoader>;

type ImportMetaWithGlob = {
  glob: (pattern: string) => GlobModules;
};

// Agent I adds `services/legacy-cleanup.service.ts` on the same branch. Resolve
// it at build time so this half compiles and boots before that file exists.
const legacyCleanupModules = (import.meta as unknown as ImportMetaWithGlob).glob(
  "../services/legacy-cleanup.service.ts",
);

export const createLegacyCleanupBoot =
  (modules: GlobModules, log: (message: string, error: unknown) => void = console.warn) =>
  async (): Promise<void> => {
    for (const load of Object.values(modules)) {
      try {
        const module = await load();
        await module.runLegacyCleanup();
      } catch (error) {
        log("[background] Legacy cleanup failed:", error);
      }
    }
  };

/** Removes offscreen-era storage keys before the recording session hydrates. */
export const runLegacyCleanupOnBoot = createLegacyCleanupBoot(legacyCleanupModules);
