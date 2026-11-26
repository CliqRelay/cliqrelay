import type { ComponentType, ReactNode } from "react";

import type { Guide } from "@repo/api-client";

export type GuideExportContext = {
  guide: Pick<Guide, "id" | "title" | "description" | "metadata">;
  replacingStepIds: string[];
};

export type GuideExportAvailability = { available: true } | { available: false; reason: string };

export type GuideExportProgress = {
  label: string;
  completed?: number;
  total?: number;
};

export type GuideExportErrorAction = {
  label: string;
  variant?: "default" | "outline";
  onClick: () => void;
};

export type GuideExportError = {
  title: string;
  messages: string[];
  actions: GuideExportErrorAction[];
};

export type GuideExportStatus = "idle" | "running" | "error" | "done";

export type GuideExportController = {
  status: GuideExportStatus;
  progress: GuideExportProgress | null;
  error: GuideExportError | null;
  config: ReactNode | null;
  startLabel: string;
  runningLabel: string;
  doneLabel: string;
  startDisabled: boolean;
  start: () => void;
  cancel: (() => void) | null;
};

export type GuideExportGroup = "download" | "integration";

export type GuideExportManifest = {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  group: GuideExportGroup;
  closeOnDone?: boolean;
  getAvailability: (context: GuideExportContext) => GuideExportAvailability;
  useController: (context: GuideExportContext) => GuideExportController;
};
