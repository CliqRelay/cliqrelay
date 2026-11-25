import { useEffect, useRef, useState } from "react";

import { api, type Guide } from "@repo/api-client";
import { GuideArchiveValue } from "@repo/data-commons";

import { toast } from "@/lib/toast";
import type { GuideArchiveExportFailure, GuideArchiveProgress } from "@/models";
import {
  GuideArchiveExportError,
  createGuideArchiveExport,
} from "@/services/guide-archive/export.service";
import { createGuideArchiveWorkerClient } from "@/services/guide-archive/guide-archive.worker.client";

type ExportStatus = "idle" | "working" | "error" | "done";

const downloadArchive = (bytes: Uint8Array, fileName: string) => {
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: GuideArchiveValue.ZipMimeType,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function useGuideArchiveExport(
  guide: Pick<Guide, "id" | "title" | "description" | "metadata">,
) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState<GuideArchiveProgress | null>(null);
  const [failures, setFailures] = useState<GuideArchiveExportFailure[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const workerRef = useRef<ReturnType<typeof createGuideArchiveWorkerClient> | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      workerRef.current?.terminate();
    },
    [],
  );

  const cancel = () => {
    controllerRef.current?.abort();
    workerRef.current?.terminate();
    controllerRef.current = null;
    workerRef.current = null;
    setStatus("idle");
    setProgress(null);
  };

  const start = async (downloadWithoutMissingScreenshots = false) => {
    controllerRef.current?.abort();
    workerRef.current?.terminate();

    const controller = new AbortController();
    const worker = createGuideArchiveWorkerClient();
    controllerRef.current = controller;
    workerRef.current = worker;
    setStatus("working");
    setFailures([]);

    const exportArchive = createGuideArchiveExport({
      fetchSteps: async (guideId, signal) => {
        const steps = [];
        let cursor: string | undefined;

        do {
          const response = await api.steps.getAllStepsByGuideId(
            { guide_id: guideId, limit: 1000, cursor },
            { credentials: "include", signal },
          );
          steps.push(...response.steps);
          cursor = response.nextCursor ?? undefined;
        } while (cursor);

        return steps;
      },
      fetchAsset: async (url, signal) => {
        const response = await fetch(url, { signal });
        if (!response.ok) {
          throw new Error(`Screenshot failed with status ${response.status}`);
        }
        return {
          bytes: new Uint8Array(await response.arrayBuffer()),
          mimeType: response.headers.get("content-type") ?? "",
        };
      },
      pack: worker.pack,
    });

    try {
      const result = await exportArchive({
        guide,
        signal: controller.signal,
        downloadWithoutMissingScreenshots,
        onProgress: setProgress,
      });
      downloadArchive(result.bytes, result.fileName);
      setStatus("done");
      toast("Backup ready", { description: "Guide ZIP download started." });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      if (error instanceof GuideArchiveExportError) {
        setFailures(error.failures);
        setStatus("error");
        return;
      }
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Failed to export guide backup",
      });
      setStatus("idle");
    } finally {
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  };

  return {
    status,
    progress,
    failures,
    start,
    retry: () => start(false),
    downloadWithoutMissingScreenshots: () => start(true),
    cancel,
  };
}
