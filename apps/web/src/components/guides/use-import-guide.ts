import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { api } from "@repo/api-client";
import { isGuideArchiveError } from "@repo/data-commons";

import { toast } from "@/lib/toast";
import {
  GUIDE_ARCHIVE_MESSAGES,
  isGuideArchiveFileTooLarge,
  type GuideArchiveImportProgress,
  type GuideArchiveImportResult,
} from "@/models";
import { createGuideArchiveWorkerClient } from "@/services/guide-archive/guide-archive.worker.client";
import {
  GuideArchiveImportError,
  createGuideArchiveImport,
} from "@/services/guide-archive/import.service";
import { putObjectWithXhr } from "@/services/steps/step-media-replace.service";
import { useTeamStore } from "@/stores";
import { invalidateGuidesCount, invalidateGuideLists } from "@/utils/guides-cache.utils";
import { getCsrfTokenHeader } from "@/utils/http.utils";
import { processImageFileForUpload, readImageDimensions } from "@/utils/image.utils";

type ImportStatus = "idle" | "working" | "done" | "error";

export function useImportGuide() {
  const queryClient = useQueryClient();
  const activeTeamId = useTeamStore((s) => s.activeTeamId);

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState<GuideArchiveImportProgress | null>(null);
  const [result, setResult] = useState<GuideArchiveImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [writeStarted, setWriteStarted] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const workerRef = useRef<ReturnType<typeof createGuideArchiveWorkerClient> | null>(null);
  const writeStartedRef = useRef(false);

  useEffect(
    () => () => {
      if (!writeStartedRef.current) {
        controllerRef.current?.abort();
      }
      workerRef.current?.terminate();
    },
    [],
  );

  const request = {
    credentials: "include" as const,
    headers: { ...getCsrfTokenHeader() },
  };

  const createGuide = api.guides.useCreateGuide({ request });
  const createStep = api.steps.useCreateStep({ request });
  const presignUpload = api.uploads.usePresignUpload({ request });
  const createMediaAsset = api.mediaAssets.useCreateMediaAsset({ request });

  const reset = () => {
    if (!writeStartedRef.current) {
      controllerRef.current?.abort();
    }
    workerRef.current?.terminate();
    controllerRef.current = null;
    workerRef.current = null;
    writeStartedRef.current = false;
    setWriteStarted(false);
    setStatus("idle");
    setProgress(null);
    setResult(null);
    setError(null);
    setFileName(null);
  };

  const cancel = () => {
    if (writeStartedRef.current) {
      return;
    }
    controllerRef.current?.abort();
    workerRef.current?.terminate();
    setStatus("idle");
    setProgress(null);
  };

  const importFile = async (file: File) => {
    if (!activeTeamId) {
      setError(GUIDE_ARCHIVE_MESSAGES.noTeam);
      setStatus("error");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError(GUIDE_ARCHIVE_MESSAGES.invalidFile);
      setStatus("error");
      return;
    }

    if (isGuideArchiveFileTooLarge(file)) {
      setError(GUIDE_ARCHIVE_MESSAGES.tooLarge);
      setStatus("error");
      return;
    }

    if (file.size <= 0) {
      setError(GUIDE_ARCHIVE_MESSAGES.invalidFile);
      setStatus("error");
      return;
    }

    const controller = new AbortController();
    const worker = createGuideArchiveWorkerClient();
    controllerRef.current = controller;
    workerRef.current = worker;
    writeStartedRef.current = false;
    setWriteStarted(false);
    setStatus("working");
    setProgress(null);
    setResult(null);
    setError(null);
    setFileName(file.name);

    const importArchive = createGuideArchiveImport({
      parseArchive: async (archiveFile, signal) =>
        worker.unpack(new Uint8Array(await archiveFile.arrayBuffer()), signal),
      createGuide: (data) => {
        writeStartedRef.current = true;
        setWriteStarted(true);
        return createGuide.mutateAsync({ data }).then((response) => response.guide);
      },
      createStep: (data) => createStep.mutateAsync({ data }).then((response) => response.step),
      presignUpload: (data) => presignUpload.mutateAsync({ data }),
      putObject: putObjectWithXhr,
      createMediaAsset: (data) =>
        createMediaAsset.mutateAsync({ data }).then((response) => response.mediaAsset),
      processImage: processImageFileForUpload,
      readDimensions: readImageDimensions,
    });

    try {
      const imported = await importArchive({
        file,
        teamId: activeTeamId,
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResult(imported);
      setStatus("done");
      invalidateGuideLists(queryClient);
      invalidateGuidesCount(queryClient);
      toast("Backup imported", { description: imported.title });
    } catch (importError) {
      if (controller.signal.aborted) {
        setStatus("idle");
        return;
      }

      if (importError instanceof GuideArchiveImportError) {
        setResult(importError.result);
        setError(importError.message);
        setStatus("error");
        if (importError.guideId) {
          invalidateGuideLists(queryClient);
          invalidateGuidesCount(queryClient);
        }
        return;
      }

      if (isGuideArchiveError(importError)) {
        setError(importError.message);
        setStatus("error");
        return;
      }

      setError(
        importError instanceof Error ? importError.message : "The backup could not be imported.",
      );
      setStatus("error");
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
    result,
    error,
    fileName,
    importFile,
    cancel,
    reset,
    canCancel: status === "working" && !writeStarted,
  };
}
