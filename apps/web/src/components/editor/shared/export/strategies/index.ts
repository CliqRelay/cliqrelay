import { archiveExportStrategy } from "./archive-export.strategy";
import { pdfExportStrategy } from "./pdf-export.strategy";
import type { GuideExportManifest } from "@/models";

export { createServerExportStrategy } from "./server-export.strategy";
export { archiveExportStrategy } from "./archive-export.strategy";
export { pdfExportStrategy } from "./pdf-export.strategy";

export const CORE_EXPORT_STRATEGIES = [
  pdfExportStrategy,
  archiveExportStrategy,
] as const satisfies readonly GuideExportManifest[];

export function getExportStrategy(
  strategies: readonly GuideExportManifest[],
  id: string,
): GuideExportManifest {
  const strategy = strategies.find((item) => item.id === id) ?? strategies[0];

  if (!strategy) {
    throw new Error("At least one guide export strategy is required.");
  }

  return strategy;
}
