import type { ExportGuideFormat } from "@repo/api-client";

import { useServerGuideExport } from "@/hooks/use-server-guide-export";
import type { GuideExportManifest } from "@/models";

type ServerExportStrategyOptions = {
  id: string;
  format: ExportGuideFormat;
  label: string;
  description: string;
  icon: GuideExportManifest["icon"];
  group?: GuideExportManifest["group"];
};

export function createServerExportStrategy({
  id,
  format,
  label,
  description,
  icon,
  group = "download",
}: ServerExportStrategyOptions): GuideExportManifest {
  return {
    id,
    label,
    description,
    icon,
    group,
    closeOnDone: true,
    getAvailability: () => ({ available: true }),
    useController: ({ guide }) => useServerGuideExport({ guideId: guide.id, format, label }),
  };
}
