import { CheckCircle2, CloudUpload, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UploadQueueInfo } from "@/models";

type Props = {
  uploadQueue: UploadQueueInfo;
};

export function UploadStatusBadges({ uploadQueue }: Props) {
  const unsynced = uploadQueue.pending + uploadQueue.inProgress;
  const hasSteps = unsynced + uploadQueue.failed + uploadQueue.completed > 0;

  if (!hasSteps) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[10px] font-medium text-muted-foreground/60">Uploads</span>
      <Badge
        variant="secondary"
        aria-label={`${uploadQueue.completed} uploaded`}
        title={`${uploadQueue.completed} uploaded`}
        className="h-5 gap-1 px-1.5 text-[10px] font-normal text-green-600"
      >
        <CheckCircle2 className="size-3" />
        {uploadQueue.completed}
      </Badge>
      <Badge
        variant="outline"
        aria-label={`${unsynced} unsynced`}
        title={`${unsynced} unsynced`}
        className="h-5 gap-1 px-1.5 text-[10px] font-normal"
      >
        <CloudUpload
          className={cn(
            "size-3",
            unsynced > 0 ? "animate-pulse text-amber-500" : "text-muted-foreground/50",
          )}
        />
        {unsynced}
      </Badge>
      {uploadQueue.failed > 0 && (
        <Badge
          variant="destructive"
          aria-label={`${uploadQueue.failed} failed`}
          title={`${uploadQueue.failed} failed`}
          className="h-5 gap-1 px-1.5 text-[10px] font-normal"
        >
          <XCircle className="size-3" />
          {uploadQueue.failed}
        </Badge>
      )}
    </div>
  );
}
