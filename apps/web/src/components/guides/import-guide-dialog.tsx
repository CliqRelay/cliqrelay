import { useRef, useState } from "react";

import { AlertCircle, CheckCircle2, FileArchive, Loader2, Upload } from "lucide-react";

import { useImportGuide } from "./use-import-guide";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GUIDE_ARCHIVE_ACCEPT,
  formatImportSummary,
  type GuideArchiveImportProgress,
  type GuideArchiveImportResult,
} from "@/models";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenGuide: (guideId: string) => void;
};

const getProgressLabel = (progress: GuideArchiveImportProgress | null) => {
  if (!progress) {
    return "Validating backup...";
  }

  switch (progress.phase) {
    case "parsing":
      return "Validating backup...";
    case "creating-guide":
      return "Creating guide...";
    case "creating-steps":
      return `Creating steps ${progress.completed}/${progress.total}`;
    case "uploading-media":
      return `Restoring screenshots ${progress.completed}/${progress.total}`;
  }
};

type DropzoneProps = {
  onSelect: (file: File) => void;
  onMultipleFiles?: () => void;
  error?: string | null;
};

export function ImportGuideDropzone({ onSelect, onMultipleFiles, error }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const selectFile = (files: FileList | null) => {
    if (!files?.length) {
      return;
    }
    if (files.length > 1) {
      onMultipleFiles?.();
      return;
    }
    onSelect(files[0]);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        selectFile(event.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Upload className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Drop a guide backup here</p>
        <p className="mt-1 text-sm text-muted-foreground">or click to select a single .zip file</p>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={GUIDE_ARCHIVE_ACCEPT}
        className="hidden"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          selectFile(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function ImportGuideProgress({
  progress,
  canCancel,
  onCancel,
}: {
  progress: GuideArchiveImportProgress | null;
  canCancel: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{getProgressLabel(progress)}</p>
      {canCancel && (
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}

export function ImportGuideResultSummary({
  result,
  error,
  onOpenGuide,
  onImportAnother,
}: {
  result: GuideArchiveImportResult;
  error?: string | null;
  onOpenGuide: () => void;
  onImportAnother: () => void;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-start gap-3">
        {error ? (
          <AlertCircle className="mt-0.5 size-5 text-destructive" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
        )}
        <div>
          <p className="font-medium">
            {error ? "Import stopped early" : formatImportSummary(result)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.importedSteps} of {result.totalSteps} steps and {result.importedMedia}{" "}
            screenshots restored.
          </p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-muted/40 p-3">
          {result.warnings.map((warning) => (
            <p key={warning} className="text-xs text-muted-foreground">
              {warning}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onOpenGuide}>Open guide</Button>
        <Button variant="outline" onClick={onImportAnother}>
          Import another
        </Button>
      </div>
    </div>
  );
}

export function ImportGuideErrorState({
  message,
  onSelectAnother,
}: {
  message: string;
  onSelectAnother: () => void;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <AlertCircle className="mt-0.5 size-5 text-destructive" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
      <Button variant="outline" onClick={onSelectAnother}>
        Select another backup
      </Button>
    </div>
  );
}

export function ImportGuideDialog({ open, onOpenChange, onOpenGuide }: Props) {
  const { status, progress, result, error, fileName, importFile, cancel, reset, canCancel } =
    useImportGuide();
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const close = (next: boolean) => {
    if (!next && status === "working") {
      return;
    }
    if (!next) {
      setSelectionError(null);
      reset();
    }
    onOpenChange(next);
  };

  const selectFile = (file: File) => {
    setSelectionError(null);
    void importFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import guide backup</DialogTitle>
          <DialogDescription>
            Import a CliqRelay .zip backup into the active team as a new draft guide.
          </DialogDescription>
        </DialogHeader>

        {status === "working" ? (
          <div className="space-y-2">
            {fileName && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <FileArchive className="size-4" />
                <span className="truncate">{fileName}</span>
              </div>
            )}
            <ImportGuideProgress progress={progress} canCancel={canCancel} onCancel={cancel} />
          </div>
        ) : result ? (
          <ImportGuideResultSummary
            result={result}
            error={error}
            onOpenGuide={() => {
              reset();
              onOpenGuide(result.guideId);
            }}
            onImportAnother={reset}
          />
        ) : status === "error" && error ? (
          <ImportGuideErrorState
            message={error}
            onSelectAnother={() => {
              setSelectionError(null);
              reset();
            }}
          />
        ) : (
          <ImportGuideDropzone
            onSelect={selectFile}
            onMultipleFiles={() => setSelectionError("Select one .zip file at a time.")}
            error={selectionError}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={status === "working"}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
