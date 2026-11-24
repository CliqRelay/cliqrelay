import { runLegacyCleanup } from "@/services/legacy-cleanup.service";

/** Removes offscreen-era storage keys before the recording session hydrates. */
export const runLegacyCleanupOnBoot = runLegacyCleanup;
