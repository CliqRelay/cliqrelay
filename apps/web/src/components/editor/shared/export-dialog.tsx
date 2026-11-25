import { useEffect, useEffectEvent, useState } from "react";

import { CheckCircle2, FileText, Loader2, Package } from "lucide-react";

import { api, type Guide } from "@repo/api-client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGuideArchiveExport } from "@/hooks/use-guide-archive-export";
import { toast } from "@/lib/toast";
import type { GuideArchiveExportFailure, GuideArchiveProgress } from "@/models";
import { getCsrfTokenHeader } from "@/utils/http.utils";

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 60_000;

export type ExportFormat = "pdf" | "zip";

type Props = {
  guide: Pick<Guide, "id" | "title" | "description" | "metadata">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replacingStepIds?: string[];
};

type FormatSelectorProps = {
  selectedFormat: ExportFormat;
  onSelect: (format: ExportFormat) => void;
  zipDisabled?: boolean;
  disabled?: boolean;
};

export function ExportFormatSelector({
  selectedFormat,
  onSelect,
  zipDisabled = false,
  disabled = false,
}: FormatSelectorProps) {
  const formats = [
    {
      id: "pdf" as const,
      name: "PDF",
      description: "A printable document of the guide.",
      icon: FileText,
      disabled: false,
    },
    {
      id: "zip" as const,
      name: "ZIP backup",
      description: "Manifest and screenshots you can re-import later.",
      icon: Package,
      disabled: zipDisabled,
    },
  ];

  return (
    <div className="grid gap-3 py-4">
      {formats.map((format) => (
        <Button
          key={format.id}
          variant="outline"
          onClick={() => !format.disabled && !disabled && onSelect(format.id)}
          disabled={disabled || format.disabled}
          className={`flex h-auto w-full items-start justify-start gap-3 rounded-lg border p-3 text-left ${
            selectedFormat === format.id ? "border-primary bg-primary/5" : "hover:bg-muted"
          } ${format.disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <format.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex w-full items-start justify-between gap-3">
            <div>
              <div className="font-medium">{format.name}</div>
              <p className="text-xs text-muted-foreground">{format.description}</p>
            </div>
            {format.id === "zip" && zipDisabled && (
              <span className="shrink-0 text-xs text-muted-foreground">Uploads in progress</span>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
}

type ArchiveStatusProps = {
  status: "idle" | "working" | "error" | "done";
  progress: GuideArchiveProgress | null;
  failures: GuideArchiveExportFailure[];
  onRetry: () => void;
  onDownloadAnyway: () => void;
  onCancel: () => void;
};

export function GuideArchiveExportStatus({
  status,
  progress,
  failures,
  onRetry,
  onDownloadAnyway,
  onCancel,
}: ArchiveStatusProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "working") {
    const label =
      progress?.phase === "packing"
        ? "Packing backup..."
        : progress
          ? `Fetching screenshots ${progress.completed}/${progress.total}`
          : "Preparing backup...";

    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">ZIP backup downloaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-4">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-sm font-medium text-destructive">
          Some screenshots could not be fetched.
        </p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {failures.map((failure, index) => (
            <li key={`${failure.stepNumber}-${index}-${failure.message}`}>
              Step {failure.stepNumber}: {failure.message}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onRetry}>
          Retry
        </Button>
        <Button variant="outline" size="sm" onClick={onDownloadAnyway}>
          Download without missing screenshots
        </Button>
      </div>
    </div>
  );
}

const isTerminalStatus = (status?: string) => status === "completed" || status === "failed";

export function ExportDialog({ open, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <ExportDialogBody key={String(open)} {...props} />
    </Dialog>
  );
}

function ExportDialogBody({ guide, onOpenChange, replacingStepIds = [] }: Omit<Props, "open">) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [exportId, setExportId] = useState<string | null>(null);
  const archiveExport = useGuideArchiveExport(guide);
  const zipDisabled = replacingStepIds.length > 0;
  const isArchiveBusy = archiveExport.status === "working";

  const exportMutation = api.guides.useExportGuide({
    mutation: {
      onSuccess: (data) => {
        setExportId(data.exportId);
      },
      onError: (error) => {
        toast.error("Export failed", {
          description: error instanceof Error ? error.message : "Failed to start export",
        });
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

  const result = statusQuery.data?.export;
  const isTerminal = isTerminalStatus(result?.status);

  const onExportSettled = useEffectEvent((status: string) => {
    if (status === "completed") {
      if (result?.downloadUrl) {
        window.open(result.downloadUrl, "_blank");
      }
      toast("Export ready", {
        description: "PDF export completed successfully",
      });
      onOpenChange(false);
    } else if (status === "failed") {
      toast.error("Export failed", {
        description: result?.errorMessage ?? "An error occurred during export",
      });
    }
  });

  useEffect(() => {
    if (result?.status && isTerminalStatus(result.status)) {
      onExportSettled(result.status);
    }
  }, [result?.status]);

  useEffect(() => {
    if (!exportId || isTerminal) {
      return;
    }
    const timer = setTimeout(() => {
      setExportId(null);
      toast.error("Export timed out", {
        description: "The export took too long. Please try again.",
      });
    }, MAX_POLL_TIME);
    return () => clearTimeout(timer);
  }, [exportId, isTerminal]);

  const handleExport = () => {
    if (!guide.id) return;
    if (selectedFormat === "zip") {
      void archiveExport.start();
      return;
    }
    exportMutation.mutate({ id: guide.id, data: { format: selectedFormat } });
  };

  const currentStatus = result?.status;
  const isExporting = exportMutation.isPending || (!!exportId && !isTerminal);
  const isProcessing = currentStatus === "processing";
  const isPending = currentStatus === "pending";
  const isBusy = isExporting || isArchiveBusy;

  const handleCancel = () => {
    if (isArchiveBusy) {
      archiveExport.cancel();
      return;
    }
    onOpenChange(false);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Export Guide</DialogTitle>
        <DialogDescription>Choose a format to export &ldquo;{guide.title}&rdquo;</DialogDescription>
      </DialogHeader>

      {selectedFormat === "zip" && archiveExport.status !== "idle" ? (
        <GuideArchiveExportStatus
          status={archiveExport.status}
          progress={archiveExport.progress}
          failures={archiveExport.failures}
          onRetry={archiveExport.retry}
          onDownloadAnyway={archiveExport.downloadWithoutMissingScreenshots}
          onCancel={archiveExport.cancel}
        />
      ) : isExporting ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isPending ? "Starting export..." : "Generating PDF..."}
          </p>
        </div>
      ) : (
        <ExportFormatSelector
          selectedFormat={selectedFormat}
          onSelect={setSelectedFormat}
          zipDisabled={zipDisabled}
          disabled={isBusy}
        />
      )}

      <DialogFooter>
        <Button variant="outline" onClick={handleCancel} disabled={isBusy && !isArchiveBusy}>
          {isArchiveBusy ? "Cancel" : isExporting ? "Exporting..." : "Close"}
        </Button>
        {archiveExport.status !== "error" && (
          <Button
            onClick={handleExport}
            disabled={isBusy || !guide.id || (selectedFormat === "zip" && zipDisabled)}
          >
            {isExporting
              ? isProcessing
                ? "Generating PDF..."
                : "Starting..."
              : isArchiveBusy
                ? "Preparing ZIP..."
                : selectedFormat === "zip"
                  ? "Download ZIP backup"
                  : "Download PDF"}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
