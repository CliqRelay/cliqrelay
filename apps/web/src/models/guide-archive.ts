import {
  GuideArchiveCanvasType,
  GuideArchiveLimit,
  GuideArchiveStepType,
  type GuideArchiveStep,
} from "@repo/data-commons";

export const GUIDE_ARCHIVE_APP_NAME = "CliqRelay";
export const GUIDE_ARCHIVE_APP_VERSION = "0.1.0";
export const GUIDE_ARCHIVE_ACCEPT = ".zip,application/zip";
export const GUIDE_ARCHIVE_MAX_FILE_BYTES = GuideArchiveLimit.MaxCompressedBytes;
export const GUIDE_ARCHIVE_TITLE_MAX_LENGTH = 255;
export const GUIDE_ARCHIVE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const GUIDE_ARCHIVE_UPLOAD_CONCURRENCY = 4;

export const GUIDE_ARCHIVE_MESSAGES = {
  invalidFile: "This file is not a valid .zip archive.",
  tooLarge: "This backup is too large. The maximum is 250 MB.",
  missingManifest: "This .zip does not contain manifest.json.",
  newerVersion: "This backup was created by a newer version of CliqRelay.",
  noTeam: "Select a team before importing a guide.",
} as const;

export type GuideArchiveExportPhase = "fetching" | "packing";
export type GuideArchiveImportPhase =
  | "parsing"
  | "creating-guide"
  | "creating-steps"
  | "uploading-media";

export type GuideArchiveProgress = {
  phase: GuideArchiveExportPhase | GuideArchiveImportPhase;
  completed: number;
  total: number;
};

export type GuideArchiveExportProgress = {
  phase: GuideArchiveExportPhase;
  completed: number;
  total: number;
};

export type GuideArchiveImportProgress = {
  phase: GuideArchiveImportPhase;
  completed: number;
  total: number;
};

export type GuideArchiveExportFailure = {
  stepNumber: number;
  message: string;
};

export type GuideArchiveImportResult = {
  guideId: string;
  title: string;
  importedSteps: number;
  totalSteps: number;
  importedMedia: number;
  skippedMedia: number;
  warnings: string[];
  partial: boolean;
};

export function normalizeGuideArchiveTitle(title: string, now = new Date()): string {
  const normalized = title.trim().slice(0, GUIDE_ARCHIVE_TITLE_MAX_LENGTH);
  return normalized || `Imported guide ${now.toISOString().slice(0, 10)}`;
}

export function isGuideArchiveFile(file: Pick<File, "name" | "size">): boolean {
  return (
    file.name.toLowerCase().endsWith(".zip") &&
    file.size > 0 &&
    file.size <= GUIDE_ARCHIVE_MAX_FILE_BYTES
  );
}

export function isGuideArchiveFileTooLarge(file: Pick<File, "size">): boolean {
  return file.size > GUIDE_ARCHIVE_MAX_FILE_BYTES;
}

export function isMediaSupportedOnStep(
  step: Pick<GuideArchiveStep, "type" | "canvasContent">,
): boolean {
  if (step.type !== GuideArchiveStepType.Canvas) {
    return true;
  }

  return (
    step.canvasContent?.type !== GuideArchiveCanvasType.Header &&
    step.canvasContent?.type !== GuideArchiveCanvasType.Code
  );
}

export function getStepScreenshotWarning(stepNumber: number): string {
  return `Step ${stepNumber} screenshot could not be restored. The step was imported without an image.`;
}

export function formatImportSummary(result: GuideArchiveImportResult): string {
  return `Imported ${result.importedSteps} of ${result.totalSteps} steps.`;
}
