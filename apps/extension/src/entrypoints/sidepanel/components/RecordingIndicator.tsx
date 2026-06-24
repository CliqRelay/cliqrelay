import { cn } from "@/lib/utils";
import type { RecordingStatus } from "@/models";

export function RecordingIndicator({
	status,
}: {
	status: RecordingStatus | undefined;
}) {
	if (!status) {
		return null;
	}

	const dotColor = {
		idle: "bg-gray-400",
		recording: "bg-green-500",
		paused: "bg-amber-500",
		stopped: "bg-gray-500",
	}[status];

	const label = {
		idle: "Idle",
		recording: "Recording",
		paused: "Paused",
		stopped: "Stopped",
	}[status];

	return (
		<span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
			<span
				className={cn(
					"size-2 rounded-full",
					dotColor,
					status === "recording" &&
						"animate-pulse-dot shadow-[0_0_8px] shadow-green-500/60",
				)}
			/>
			{label}
		</span>
	);
}
