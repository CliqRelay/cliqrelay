import { Package } from "lucide-react";

import { useGuideArchiveExport } from "@/hooks/use-guide-archive-export";
import type { GuideArchiveProgress, GuideExportController, GuideExportManifest } from "@/models";

const getProgressLabel = (progress: GuideArchiveProgress | null) => {
  if (!progress) {
    return "Preparing backup...";
  }

  if (progress.phase === "packing") {
    return "Packing backup...";
  }

  return `Fetching screenshots ${progress.completed}/${progress.total}`;
};

export const archiveExportStrategy: GuideExportManifest = {
  id: "zip",
  label: "ZIP backup",
  description: "Manifest and screenshots you can re-import later.",
  icon: Package,
  group: "download",
  getAvailability: ({ replacingStepIds }) =>
    replacingStepIds.length > 0
      ? { available: false, reason: "Uploads in progress" }
      : { available: true },
  useController: ({ guide }) => {
    const archive = useGuideArchiveExport(guide);
    const status: GuideExportController["status"] =
      archive.status === "working" ? "running" : archive.status;

    const error: GuideExportController["error"] =
      archive.status === "error"
        ? {
            title: "Some screenshots could not be fetched.",
            messages: archive.failures.map(
              (failure) => `Step ${failure.stepNumber}: ${failure.message}`,
            ),
            actions: [
              { label: "Retry", onClick: archive.retry },
              {
                label: "Download without missing screenshots",
                variant: "outline",
                onClick: archive.downloadWithoutMissingScreenshots,
              },
            ],
          }
        : null;

    return {
      status,
      progress:
        archive.status === "working"
          ? {
              label: getProgressLabel(archive.progress),
              completed: archive.progress?.completed,
              total: archive.progress?.total,
            }
          : null,
      error,
      config: null,
      startLabel: "Download ZIP backup",
      runningLabel: "Preparing ZIP...",
      doneLabel: "ZIP backup downloaded.",
      startDisabled: false,
      start: () => void archive.start(),
      cancel: archive.cancel,
    };
  },
};
