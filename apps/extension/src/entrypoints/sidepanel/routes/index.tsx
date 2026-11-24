import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { api } from "@repo/api-client";

import {
  CaptureSessionPanel,
  DeleteGuideDialog,
  DeleteStepDialog,
  PersistedGuideView,
  RecentGuidesList,
  RecordingControls,
  StepList,
} from "../components";
import { useActiveTeamId } from "../hooks/useActiveTeamId";
import { fetchAuthSession } from "../hooks/useAuthSession";
import { useLiveSession } from "../hooks/useLiveSession";
import { useRecordingLifecycle } from "../hooks/useRecordingLifecycle";
import { useSessionSteps } from "../hooks/useSessionSteps";
import { useSidePanelCommands } from "../hooks/useSidePanelCommands";
import { useSignedOutRedirect } from "../hooks/useSignedOutRedirect";
import { useSyncCounts } from "../hooks/useSyncCounts";
import { deriveIsDraining, toUploadQueueInfo } from "@/models";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    try {
      await fetchAuthSession(context.queryClient);
    } catch {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: Home,
});

function Home() {
  const lifecycle = useRecordingLifecycle();
  useSignedOutRedirect(lifecycle.isSignedOut);

  const commands = useSidePanelCommands();
  const session = useLiveSession(lifecycle.sessionId);
  const { progress } = useSessionSteps(lifecycle.sessionId);
  const counts = useSyncCounts(lifecycle.sessionId);

  const queryClient = useQueryClient();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingGuideId, setViewingGuideId] = useState<string | null>(null);

  const { teamId } = useActiveTeamId();
  const [viewedTeamId, setViewedTeamId] = useState(teamId);
  if (teamId !== viewedTeamId) {
    setViewedTeamId(teamId);
    setViewingGuideId(null);
  }

  const status = lifecycle.status;
  const guideId = session?.guideId ?? null;
  const uploadQueue = toUploadQueueInfo(counts);
  const isDraining = deriveIsDraining(status, counts);
  const isActive = status === "recording" || status === "paused";
  const stepCount = progress.length;

  const invalidateGuides = () =>
    queryClient.invalidateQueries({
      queryKey: api.guides.getGetAllGuidesQueryKey(),
    });

  const [deletingStep, setDeletingStep] = useState<{
    id: string;
    actionText?: string | null;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [deleteGuideDialogOpen, setDeleteGuideDialogOpen] = useState(false);

  const withPending = async (fn: () => Promise<unknown>) => {
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
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
      await commands.deleteStep(deletingStep.id);
    } catch (err) {
      console.error("[sidepanel] Failed to delete step:", err);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingStep(null);
    }
  };

  const handleDismiss = (stepId: string) => {
    void commands.dismissStep(stepId);
  };

  const handleDeleteGuide = () => {
    setDeleteGuideDialogOpen(true);
  };

  const handleDeleteGuideConfirm = async () => {
    try {
      await withPending(async () => {
        if (guideId) {
          await commands.deleteGuide(guideId);
        }
        await invalidateGuides();
      });
    } finally {
      setDeleteGuideDialogOpen(false);
    }
  };

  const handleStart = () =>
    withPending(async () => {
      setViewingGuideId(null);
      await commands.startRecording();
    });
  const handleStop = () =>
    withPending(async () => {
      await commands.stopRecording();
      await invalidateGuides();
    });
  const handlePause = () => withPending(commands.pauseRecording);
  const handleResume = () => withPending(commands.resumeRecording);
  const handleRetryFailed = () => {
    void commands.retryFailed(lifecycle.sessionId);
  };

  if (viewingGuideId) {
    return <PersistedGuideView guideId={viewingGuideId} onBack={() => setViewingGuideId(null)} />;
  }

  if (isActive || isDraining) {
    return (
      <>
        <CaptureSessionPanel
          status={status ?? "idle"}
          steps={progress}
          uploadQueue={uploadQueue}
          isDraining={isDraining}
          guideId={guideId}
          stepCount={stepCount}
          isPending={isPending}
          error={error}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onDeleteStep={handleDeleteRequest}
          onDismiss={handleDismiss}
          onRetryFailed={handleRetryFailed}
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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-2">
      <div className="flex shrink-0 items-center justify-between">
        <span className="text-[13px] font-semibold text-foreground/80">Capture Session</span>
      </div>
      <div className="shrink-0">
        <RecordingControls
          status={status}
          onStart={handleStart}
          onStop={handleStop}
          isPending={isPending}
          error={error}
          uploadQueue={uploadQueue}
        />
      </div>
      {progress.length === 0 && <RecentGuidesList onSelectGuide={setViewingGuideId} />}
      {progress.length > 0 && (
        <>
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground/60">Steps</span>
          <div className="min-h-0 flex-1">
            <StepList
              mode="recording"
              steps={progress}
              onDeleteStep={handleDeleteRequest}
              onDismiss={handleDismiss}
            />
          </div>
        </>
      )}
      {guideId && (
        <button
          type="button"
          onClick={handleDeleteGuide}
          className="shrink-0 self-start text-[10px] text-destructive/60 transition-colors hover:text-destructive"
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
