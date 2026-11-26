import { useEffect, useEffectEvent, useState } from "react";

import { api, type ExportGuideFormat } from "@repo/api-client";

import { toast } from "@/lib/toast";
import type { GuideExportController } from "@/models";
import { getCsrfTokenHeader } from "@/utils/http.utils";

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 60_000;

const isTerminalStatus = (status?: string) => status === "completed" || status === "failed";

type Options = {
  guideId: string;
  format: ExportGuideFormat;
  label: string;
};

type ExportErrorState = {
  title: string;
  messages: string[];
};

export function useServerGuideExport({ guideId, format, label }: Options): GuideExportController {
  const [started, setStarted] = useState(false);
  const [exportId, setExportId] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<ExportErrorState | null>(null);

  const exportMutation = api.guides.useExportGuide({
    mutation: {
      onSuccess: (data) => {
        setExportId(data.exportId);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Failed to start export";
        setErrorState({ title: "Export failed", messages: [message] });
        toast.error("Export failed", { description: message });
      },
    },
    request: {
      credentials: "include",
      headers: {
        ...getCsrfTokenHeader(),
      },
    },
  });

  const statusQuery = api.guides.useGetExportStatus(exportId ?? "", {
    query: {
      enabled: !!exportId,
      refetchInterval: (query) =>
        isTerminalStatus(query.state.data?.export?.status) ? false : POLL_INTERVAL,
    },
    request: {
      credentials: "include",
    },
  });

  const result = exportId ? statusQuery.data?.export : undefined;
  const resultStatus = result?.status;
  const isTerminal = isTerminalStatus(resultStatus);

  const statusErrorMessage =
    resultStatus === "failed"
      ? (result?.errorMessage ?? "An error occurred during export")
      : exportId && statusQuery.error
        ? statusQuery.error instanceof Error
          ? statusQuery.error.message
          : "Failed to check the export status"
        : null;

  const error: GuideExportController["error"] = errorState
    ? { ...errorState, actions: [{ label: "Try again", onClick: () => start() }] }
    : statusErrorMessage
      ? {
          title: "Export failed",
          messages: [statusErrorMessage],
          actions: [{ label: "Try again", onClick: () => start() }],
        }
      : null;

  const status: GuideExportController["status"] = error
    ? "error"
    : resultStatus === "completed"
      ? "done"
      : started
        ? "running"
        : "idle";

  const onExportSettled = useEffectEvent((exportStatus: string) => {
    if (exportStatus === "completed") {
      if (result?.downloadUrl) {
        window.open(result.downloadUrl, "_blank");
      }
      toast("Export ready", {
        description: `${label} export completed successfully`,
      });
      return;
    }

    const message = result?.errorMessage ?? "An error occurred during export";
    toast.error("Export failed", { description: message });
  });

  useEffect(() => {
    if (resultStatus && isTerminalStatus(resultStatus)) {
      onExportSettled(resultStatus);
    }
  }, [resultStatus]);

  useEffect(() => {
    if (!exportId || isTerminal) {
      return;
    }

    const timer = setTimeout(() => {
      setExportId(null);
      setErrorState({
        title: "Export timed out",
        messages: ["The export took too long. Please try again."],
      });
      toast.error("Export timed out", {
        description: "The export took too long. Please try again.",
      });
    }, MAX_POLL_TIME);

    return () => clearTimeout(timer);
  }, [exportId, isTerminal]);

  const start = () => {
    if (!guideId || status === "running" || exportMutation.isPending) {
      return;
    }

    setStarted(true);
    setErrorState(null);
    setExportId(null);
    exportMutation.mutate({ id: guideId, data: { format } });
  };

  return {
    status,
    progress: null,
    error,
    config: null,
    startLabel: `Download ${label}`,
    runningLabel: exportId ? `Generating ${label}...` : "Starting export...",
    doneLabel: `${label} export ready.`,
    startDisabled: !guideId || status === "running",
    start,
    cancel: null,
  };
}
