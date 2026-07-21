import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { api } from "@repo/api-client";

import { useSidePanelBridge } from "../hooks/useSidePanelBridge";
import { useSidePanelStore } from "../stores/sidepanel-store";
import {
	CaptureSessionPanel,
	DeleteGuideDialog,
	DeleteStepDialog,
	PersistedGuideView,
	RecordingControls,
	StepList,
} from "../components";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const bridge = useSidePanelBridge();
	const status = useSidePanelStore((s) => s.status);
	const isDraining = useSidePanelStore((s) => s.isDraining);
	const uploadQueue = useSidePanelStore((s) => s.uploadQueue);
	const activeGuideId = useSidePanelStore((s) => s.activeGuideId);
	const jobProgress = useSidePanelStore((s) => s.jobProgress);
	const bufferedCount = useSidePanelStore((s) => s.bufferedCount);
	const removeJobProgress = useSidePanelStore((s) => s.removeJobProgress);
	const clearStore = useSidePanelStore((s) => s.clear);

	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const stepCount = jobProgress.length;
	const isActive = status === "recording" || status === "paused";

	const deleteGuideMutation = api.guides.useDeleteGuide({
		request: { credentials: "include" },
	});
	const deleteStepMutation = api.steps.useDeleteStep({
		request: { credentials: "include" },
	});

	const showPersistedView = !!(
		status !== "recording" &&
		status !== "paused" &&
		activeGuideId &&
		!isDraining &&
		jobProgress.length === 0
	);

	const [deletingStep, setDeletingStep] = useState<{
		id: string;
		actionText?: string | null;
	} | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const [deleteGuideDialogOpen, setDeleteGuideDialogOpen] = useState(false);

	const withPending = async (fn: () => Promise<void>) => {
		if (isPending) return;
		setError(null);
		setIsPending(true);
		try {
			await fn();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unknown error occurred",
			);
		} finally {
			setIsPending(false);
		}
	};

	const handleDeleteRequest = (id: string, actionText?: string | null) => {
		setDeletingStep({ id, actionText });
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!deletingStep) return;
		try {
			await deleteStepMutation.mutateAsync({ id: deletingStep.id });
			const match = jobProgress.find(
				(jp) => jp.stepId === deletingStep.id || jp.jobId === deletingStep.id,
			);
			if (match) {
				bridge.dismissJob(match.jobId);
				removeJobProgress(match.jobId);
			}
		} catch (err) {
			console.error("[sidepanel] Failed to delete step:", err);
		} finally {
			setDeleteDialogOpen(false);
			setDeletingStep(null);
		}
	};

	const handleDismiss = (jobId: string) => {
		bridge.dismissJob(jobId);
		removeJobProgress(jobId);
	};

	const handleDeleteGuide = () => {
		setDeleteGuideDialogOpen(true);
	};

	const handleDeleteGuideConfirm = async () => {
		if (isPending) return;
		setError(null);
		setIsPending(true);
		try {
			await bridge.stopRecording();
			if (activeGuideId) {
				await deleteGuideMutation.mutateAsync({ id: activeGuideId });
			}
			clearStore();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unknown error occurred",
			);
		} finally {
			setIsPending(false);
			setDeleteGuideDialogOpen(false);
		}
	};

	const handleStart = () => withPending(bridge.startRecording);
	const handleStop = () => withPending(bridge.stopRecording);
	const handlePause = () => withPending(bridge.pauseRecording);
	const handleResume = () => withPending(bridge.resumeRecording);

	if (isActive) {
		return (
			<>
				<CaptureSessionPanel
					status={status}
					jobProgress={jobProgress}
					bufferedCount={bufferedCount}
					uploadQueue={uploadQueue}
					isDraining={isDraining}
					activeGuideId={activeGuideId}
					stepCount={stepCount}
					isPending={isPending}
					error={error}
					onPause={handlePause}
					onResume={handleResume}
					onStop={handleStop}
					onDeleteStep={handleDeleteRequest}
					onDismiss={handleDismiss}
					onDeleteGuide={handleDeleteGuide}
				/>
				<DeleteStepDialog
					step={deletingStep}
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
					onConfirm={handleDeleteConfirm}
				/>
				<DeleteGuideDialog
					open={deleteGuideDialogOpen}
					onOpenChange={setDeleteGuideDialogOpen}
					onConfirm={handleDeleteGuideConfirm}
					isPending={isPending}
				/>
			</>
		);
	}

	if (showPersistedView && activeGuideId) {
		return (
			<>
				<PersistedGuideView activeGuideId={activeGuideId} />
				<DeleteGuideDialog
					open={deleteGuideDialogOpen}
					onOpenChange={setDeleteGuideDialogOpen}
					onConfirm={handleDeleteGuideConfirm}
					isPending={isPending}
				/>
			</>
		);
	}

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-2">
			<div className="flex shrink-0 items-center justify-between">
				<span className="text-[13px] font-semibold text-foreground/80">
					Capture Session
				</span>
			</div>
			<RecordingControls
				status={status}
				onStart={handleStart}
				onStop={handleStop}
				isPending={isPending}
				error={error}
				uploadQueue={uploadQueue}
			/>
			{jobProgress.length > 0 && (
				<span className="shrink-0 text-[11px] font-semibold text-muted-foreground/60">
					Steps
				</span>
			)}
			<div className="min-h-0 flex-1">
				<StepList
					mode="recording"
					steps={jobProgress}
					bufferedCount={bufferedCount}
					onDeleteStep={handleDeleteRequest}
					onDismiss={handleDismiss}
				/>
			</div>
			{activeGuideId && (
				<button
					type="button"
					onClick={handleDeleteGuide}
					className="shrink-0 self-start text-[10px] text-destructive/60 hover:text-destructive transition-colors"
				>
					Delete guide
				</button>
			)}
			<DeleteStepDialog
				step={deletingStep}
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				onConfirm={handleDeleteConfirm}
			/>
			<DeleteGuideDialog
				open={deleteGuideDialogOpen}
				onOpenChange={setDeleteGuideDialogOpen}
				onConfirm={handleDeleteGuideConfirm}
				isPending={isPending}
			/>
		</div>
	);
}
