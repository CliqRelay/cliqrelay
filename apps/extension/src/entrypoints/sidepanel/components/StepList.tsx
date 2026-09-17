import { type ReactNode, type Ref, type RefObject, useRef } from "react";

import { motion } from "framer-motion";
import { FileTextIcon, MousePointerClick } from "lucide-react";

import type { Step } from "@repo/api-client";

import { useInfiniteScrollSentinel } from "../hooks/useInfiniteScrollSentinel";
import { useStickToBottom } from "../hooks/useStickToBottom";
import { StepCardRecording } from "./StepCardRecording";
import { StepCardView } from "./StepCardView";
import { StepListJumpToLatest } from "./StepListJumpToLatest";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { StepJobProgress } from "@/models";

type RecordingModeProps = {
  mode: "recording";
  steps: StepJobProgress[];
  bufferedCount: number;
  onDeleteStep?: (stepId: string, actionText?: string | null) => void;
  onDismiss?: (jobId: string) => void;
};

type ViewModeProps = {
  mode: "view";
  persistedSteps: Step[];
  isLoading?: boolean;
  error?: Error | null;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onDeleteStep?: (id: string, actionText?: string | null) => void;
};

type Props = RecordingModeProps | ViewModeProps;

export function StepList(props: Props) {
  if (props.mode === "recording") {
    return <RecordingStepList {...props} />;
  }
  return <ViewStepList {...props} />;
}

function RecordingStepList({
  steps,
  bufferedCount,
  onDeleteStep,
  onDismiss,
}: {
  steps: StepJobProgress[];
  bufferedCount: number;
  onDeleteStep?: (stepId: string, actionText?: string | null) => void;
  onDismiss?: (jobId: string) => void;
}) {
  const sorted = [...steps].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  );

  const { viewportRef, contentRef, isPinned, scrollToBottom } = useStickToBottom({
    enabled: sorted.length > 0,
  });

  if (sorted.length === 0 && bufferedCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-2 py-8"
      >
        <MousePointerClick className="size-8 text-muted-foreground/30" />
        <p className="max-w-40 text-center text-[11px] leading-relaxed text-muted-foreground/60">
          No captures yet. Start recording to see events here.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="relative h-full w-full min-w-0">
      <StepListScroll viewportRef={viewportRef} contentRef={contentRef}>
        {sorted.map((step, index) => (
          <StepCardRecording
            key={step.jobId}
            step={step}
            stepNumber={index + 1}
            onDelete={onDeleteStep}
            onDismiss={onDismiss}
          />
        ))}
      </StepListScroll>
      <StepListJumpToLatest visible={!isPinned} onClick={scrollToBottom} />
    </div>
  );
}

function ViewStepList({
  persistedSteps,
  isLoading,
  error,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  onDeleteStep,
}: {
  persistedSteps: Step[];
  isLoading?: boolean;
  error?: Error | null;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onDeleteStep?: (id: string, actionText?: string | null) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    const skeletonKeys = ["skeleton-1", "skeleton-2", "skeleton-3"];
    return (
      <StepListScroll>
        {skeletonKeys.map((key) => (
          <div
            key={key}
            className="flex flex-col gap-1.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
          >
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="aspect-4/3 w-full rounded-lg" />
          </div>
        ))}
      </StepListScroll>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="max-w-40 text-[11px] leading-relaxed text-destructive/80">
          Failed to load steps. Close and reopen the sidepanel to retry.
        </p>
      </div>
    );
  }

  if (persistedSteps.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-2 py-8"
      >
        <FileTextIcon className="size-8 text-muted-foreground/30" />
        <p className="max-w-40 text-center text-[11px] leading-relaxed text-muted-foreground/60">
          No steps in this guide yet.
        </p>
      </motion.div>
    );
  }

  return (
    <StepListScroll viewportRef={viewportRef}>
      {persistedSteps.map((step, index) => (
        <StepCardView key={step.id} step={step} stepNumber={index + 1} onDelete={onDeleteStep} />
      ))}
      {onLoadMore && (
        <StepListLoadMore
          viewportRef={viewportRef}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
        />
      )}
    </StepListScroll>
  );
}

function StepListLoadMore({
  viewportRef,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useInfiniteScrollSentinel({
    enabled: hasNextPage && !isFetchingNextPage,
    onIntersect: onLoadMore,
    rootRef: viewportRef,
  });

  if (!hasNextPage) {
    return null;
  }

  return (
    <div ref={sentinelRef}>
      {isFetchingNextPage && <Skeleton className="h-24 w-full rounded-xl" />}
    </div>
  );
}

function StepListScroll({
  viewportRef,
  contentRef,
  children,
}: {
  viewportRef?: Ref<HTMLDivElement>;
  contentRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <ScrollArea viewportRef={viewportRef} type="auto" className="h-full w-full min-w-0">
      <div ref={contentRef} className="flex w-full min-w-0 flex-col gap-4 p-4">
        {children}
      </div>
    </ScrollArea>
  );
}
