import { Check, Loader2, Pause, Play, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
	RecordingStatus,
	StepJobProgress,
	UploadQueueInfo,
} from "@/models";
import { RecordingIndicator } from "./RecordingIndicator";
import { StepList } from "./StepList";
import { UploadStatusBadges } from "./UploadStatusBadges";

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

	return (
		<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
			<div className="flex shrink-0 items-center justify-between px-4 py-2">
				<span className="text-[13px] font-semibold text-foreground/80">
					Capture Session
				</span>
				<RecordingIndicator status={status} />
			</div>

			<Separator />

			{/* Scrollable step list */}
			<div className="flex-1 min-h-0">
				<StepList
					mode="recording"
					steps={jobProgress}
					bufferedCount={bufferedCount}
					onDeleteStep={onDeleteStep}
					onDismiss={onDismiss}
				/>
			</div>

			{/* Bottom control card */}
			<div className="shrink-0 border-t border-border/50">
				<Card className="border-border/50 rounded">
					<CardContent className="flex flex-col gap-3">
						{/* Status row */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								{stepCount > 0 && (
									<Badge
										variant="secondary"
										className="h-5 gap-1 px-1.5 text-[10px] font-normal"
									>
										{stepCount} step{stepCount !== 1 ? "s" : ""}
									</Badge>
								)}
								{activeGuideId && (
									<Badge
										variant="outline"
										className="h-5 px-1.5 text-[10px] font-normal font-mono"
									>
										{activeGuideId.slice(0, 8)}…
									</Badge>
								)}
							</div>
							<UploadStatusBadges uploadQueue={uploadQueue} />
						</div>

						{isDraining && (
							<div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
								<Loader2 className="size-3.5 animate-spin text-muted-foreground/60" />
								<span className="text-[11px] font-medium text-muted-foreground/70">
									Finalizing uploads...
								</span>
							</div>
						)}

						<Separator />

						{/* Action buttons */}
						<div className="flex flex-col gap-4">
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									className="gap-1.5"
									onClick={handlePauseResume}
									disabled={isPending}
								>
									{isPaused ? (
										<Play className="size-4" />
									) : (
										<Pause className="size-4" />
									)}
									{isPaused ? "Resume" : "Pause"}
								</Button>
								<Button
									variant="outline"
									className="ml-auto gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
									onClick={onDeleteGuide}
									disabled={isPending}
								>
									<Trash2 className="size-3" />
									Delete Guide
								</Button>
							</div>

							<div className="w-full">
								<Button
									variant="default"
									className="w-full p-6 gap-1.5"
									onClick={onStop}
									disabled={isPending}
								>
									<Check className="size-8" />
									<span className="text-lg">Complete Capture</span>
								</Button>
							</div>
						</div>

						{error && (
							<p className="text-[11px] text-destructive text-center leading-relaxed">
								{error}
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
