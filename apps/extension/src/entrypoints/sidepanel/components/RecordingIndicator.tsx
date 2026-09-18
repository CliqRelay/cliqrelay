import { cn } from "@/lib/utils";
import type { RecordingStatus } from "@/models";

const statusStyles: Record<
  RecordingStatus,
  { label: string; pill: string; dot: string; ping: boolean }
> = {
  idle: {
    label: "Idle",
    pill: "bg-muted text-muted-foreground ring-border",
    dot: "bg-muted-foreground/60",
    ping: false,
  },
  recording: {
    label: "Recording",
    pill: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
    ping: true,
  },
  paused: {
    label: "Paused",
    pill: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
    dot: "bg-amber-500",
    ping: false,
  },
  stopped: {
    label: "Stopped",
    pill: "bg-muted text-muted-foreground ring-border",
    dot: "bg-muted-foreground/60",
    ping: false,
  },
};

export function RecordingIndicator({ status }: { status: RecordingStatus | undefined }) {
  if (!status) {
    return null;
  }

  const { label, pill, dot, ping } = statusStyles[status];

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        pill,
      )}
    >
      <span className="relative flex size-2 shrink-0">
        {ping && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-70",
              dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
      </span>
      {label}
    </span>
  );
}
