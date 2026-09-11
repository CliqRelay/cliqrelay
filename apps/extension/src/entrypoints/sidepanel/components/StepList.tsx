import { type ReactNode, type Ref, useEffect, useRef } from "react";

import { motion } from "framer-motion";
import { FileTextIcon, MousePointerClick } from "lucide-react";

import type { Step } from "@repo/api-client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { StepJobProgress } from "@/models";
import { StepCardRecording } from "./StepCardRecording";
import { StepCardView } from "./StepCardView";

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
	const viewportRef = useRef<HTMLDivElement>(null);
	const sorted = [...steps].sort(
		(a, b) =>
			new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
	);

	const prevLengthRef = useRef(sorted.length);

	useEffect(() => {
		const prevLen = prevLengthRef.current;
		prevLengthRef.current = sorted.length;
		if (sorted.length <= prevLen) return;

		const viewport = viewportRef.current;
		if (!viewport) return;

		const isNearBottom =
			viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 150;
		if (!isNearBottom) return;

		requestAnimationFrame(() => {
			viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
		});
	}, [sorted.length]);

	if (sorted.length === 0 && bufferedCount === 0) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
				className="flex flex-col items-center gap-2 py-8"
			>
				<MousePointerClick className="size-8 text-muted-foreground/30" />
				<p className="text-[11px] text-muted-foreground/60 text-center max-w-40 leading-relaxed">
					No captures yet. Start recording to see events here.
				</p>
			</motion.div>
		);
	}

	return (
		<StepListScroll viewportRef={viewportRef}>
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
	);
}

function ViewStepList({
	persistedSteps,
	isLoading,
	error,
	onDeleteStep,
}: {
	persistedSteps: Step[];
	isLoading?: boolean;
	error?: Error | null;
	onDeleteStep?: (id: string, actionText?: string | null) => void;
}) {
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
				<p className="text-[11px] text-destructive/80 max-w-40 leading-relaxed">
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
				<p className="text-[11px] text-muted-foreground/60 text-center max-w-40 leading-relaxed">
					No steps in this guide yet.
				</p>
			</motion.div>
		);
	}

	const sorted = [...persistedSteps].sort((a, b) =>
		(a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""),
	);

	return (
		<StepListScroll>
			{sorted.map((step, index) => (
				<StepCardView
					key={step.id}
					step={step}
					stepNumber={index + 1}
					onDelete={onDeleteStep}
				/>
			))}
		</StepListScroll>
	);
}

function StepListScroll({
	viewportRef,
	children,
}: {
	viewportRef?: Ref<HTMLDivElement>;
	children: ReactNode;
}) {
	return (
		<ScrollArea viewportRef={viewportRef} type="auto" className="h-full w-full min-w-0">
			<div className="flex w-full min-w-0 flex-col gap-4 p-4">{children}</div>
		</ScrollArea>
	);
}
