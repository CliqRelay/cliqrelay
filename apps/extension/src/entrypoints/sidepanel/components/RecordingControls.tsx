import type { RecordingStatus, UploadQueueInfo } from "@/models";
import { AnimatedRecordingButton } from "./AnimatedRecordingButton";

type RecordingControlsProps = {
	status: RecordingStatus | undefined;
	onStart: () => Promise<void>;
	onStop: () => Promise<void>;
	isPending: boolean;
	error: string | null;
	uploadQueue?: UploadQueueInfo;
};

export function RecordingControls({
	status,
	onStart,
	onStop,
	isPending,
	error,
	uploadQueue,
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
				uploadQueue={uploadQueue}
			/>

			<span className="text-[11px] font-medium text-muted-foreground tracking-wide">
				{label}
			</span>

			{isIdle && !isPending && !error && (
				<p className="text-[10px] text-muted-foreground/50 text-center max-w-40 leading-relaxed">
					Start recording to capture steps for a new guide
				</p>
			)}

			{error && (
				<p className="text-[11px] text-destructive text-center max-w-50 leading-relaxed">
					{error}
				</p>
			)}
		</div>
	);
}
