import type { ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, Loader2, Pause, Play, Trash2 } from "lucide-react";

import { RecordingIndicator } from "./RecordingIndicator";
import { StepList } from "./StepList";
import { UploadStatusBadges } from "./UploadStatusBadges";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RecordingStatus, StepJobProgress, UploadQueueInfo } from "@/models";

type CaptureSessionPanelProps = {
  status: RecordingStatus;
  jobProgress: StepJobProgress[];
  bufferedCount: number;
  uploadQueue: UploadQueueInfo;
  isDraining: boolean;
  activeGuideId: string | null;
  stepCount: number;
  isPending: boolean;
  error: string | null;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => Promise<void>;
  onDeleteStep: (id: string, actionText?: string | null) => void;
  onDismiss: (jobId: string) => void;
  onDeleteGuide: () => void;
};

export function CaptureSessionPanel({
  status,
  jobProgress,
  bufferedCount,
  uploadQueue,
  isDraining,
  activeGuideId,
  stepCount,
  isPending,
  error,
  onPause,
  onResume,
  onStop,
  onDeleteStep,
  onDismiss,
  onDeleteGuide,
}: CaptureSessionPanelProps) {
  const isPaused = status === "paused";
  const handlePauseResume = isPaused ? onResume : onPause;

  const hasUploads =
    uploadQueue.pending + uploadQueue.inProgress + uploadQueue.failed + uploadQueue.completed > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SessionHeader
        status={status}
        isPaused={isPaused}
        stepCount={stepCount}
        activeGuideId={activeGuideId}
      />

      <div className="min-h-0 flex-1">
        <StepList
          mode="recording"
          steps={jobProgress}
          bufferedCount={bufferedCount}
          onDeleteStep={onDeleteStep}
          onDismiss={onDismiss}
        />
      </div>

      <div className="shrink-0 border-t border-border/60 bg-card/70 backdrop-blur-sm">
        <div className="flex flex-col gap-2.5 p-3">
          <AnimatePresence initial={false}>
            {isDraining && (
              <Collapsible key="draining">
                <StatusStrip>
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground/70" />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Finalizing uploads…
                  </span>
                </StatusStrip>
              </Collapsible>
            )}

            {hasUploads && !isDraining && (
              <Collapsible key="uploads">
                <StatusStrip>
                  <UploadStatusBadges uploadQueue={uploadQueue} />
                </StatusStrip>
              </Collapsible>
            )}

            {error && (
              <Collapsible key="error">
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-2.5 py-2 ring-1 ring-destructive/20 ring-inset">
                  <AlertCircle className="mt-px size-3.5 shrink-0 text-destructive" />
                  <p className="text-[11px] leading-relaxed text-destructive">{error}</p>
                </div>
              </Collapsible>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <CircleAction
              label={isPaused ? "Resume capture" : "Pause capture"}
              disabled={isPending}
              onClick={handlePauseResume}
            >
              {isPaused ? <Play /> : <Pause />}
            </CircleAction>

            <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />

            <CircleAction
              label="Delete guide"
              tone="destructive"
              disabled={isPending}
              onClick={onDeleteGuide}
            >
              <Trash2 />
            </CircleAction>
          </div>

          <Button
            className="h-11 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm shadow-primary/25"
            onClick={onStop}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Complete capture
          </Button>
        </div>
      </div>
    </div>
  );
}

function CircleAction({
  label,
  tone = "default",
  disabled,
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "destructive";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "size-10 rounded-full shadow-xs",
            tone === "destructive" &&
              "text-destructive/80 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SessionHeader({
  status,
  isPaused,
  stepCount,
  activeGuideId,
}: {
  status: RecordingStatus;
  isPaused: boolean;
  stepCount: number;
  activeGuideId: string | null;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border-b border-border/60 px-4 py-3 transition-colors duration-500",
        isPaused ? "bg-amber-500/10" : "bg-destructive/5",
      )}
    >
      <LiveRail isPaused={isPaused} />

      <div className="flex items-center gap-2">
        <RecordingIndicator status={status} />
        <span className="ml-auto text-[11px] font-medium text-muted-foreground tabular-nums">
          {stepCount} step{stepCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-1.5 flex items-end gap-2">
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground/70">
          {isPaused
            ? "Paused — actions on the page aren't captured."
            : "Capturing clicks and inputs on the active tab."}
        </p>
        {activeGuideId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
                {activeGuideId.slice(0, 8)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-[11px]">
              {activeGuideId}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function LiveRail({ isPaused }: { isPaused: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  if (isPaused) {
    return <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500/40" />;
  }

  if (shouldReduceMotion) {
    return <div className="absolute inset-x-0 top-0 h-0.5 bg-destructive/40" />;
  }

  return (
    <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-destructive/10">
      <motion.div
        className="h-full w-1/3 bg-linear-to-r from-transparent via-destructive to-transparent"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function Collapsible({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function StatusStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 ring-1 ring-border/60 ring-inset">
      {children}
    </div>
  );
}
