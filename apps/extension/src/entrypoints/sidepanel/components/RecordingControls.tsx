import { AnimatedRecordingButton } from "./AnimatedRecordingButton";
import type { RecordingStatus } from "@/models";

type RecordingControlsProps = {
  status: RecordingStatus | undefined;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  isPending: boolean;
  error: string | null;
};

export function RecordingControls({
  status,
  onStart,
  onStop,
  isPending,
  error,
}: RecordingControlsProps) {
  if (status === "recording" || status === "paused") {
    return null;
  }

  const isIdle = !status || status === "idle";
  const isStopped = status === "stopped";

  const label = isStopped ? "Start new recording" : "Start capturing";

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <AnimatedRecordingButton
        status={status}
        onStart={onStart}
        onStop={onStop}
        isPending={isPending}
      />

      <span className="text-[11px] font-medium tracking-wide text-muted-foreground">{label}</span>

      {isIdle && !isPending && !error && (
        <p className="max-w-40 text-center text-[10px] leading-relaxed text-muted-foreground/50">
          Start recording to capture steps for a new guide
        </p>
      )}

      {error && (
        <p className="max-w-50 text-center text-[11px] leading-relaxed text-destructive">{error}</p>
      )}
    </div>
  );
}
