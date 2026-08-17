import type { ReactNode } from "react";

import { motion } from "framer-motion";
import { ChevronRight, FileText, LogIn, RotateCw, Star } from "lucide-react";

import type { Guide } from "@repo/api-client";
import {
	formatGuideCreationTime,
	formatGuideDuration,
} from "@repo/data-commons";

import { GuideStatusBadge } from "@/components/guides/guide-status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRecentGuides } from "../hooks/useRecentGuides";

// Radix renders the viewport's content wrapper as `display: table`, which
// inflates the scrollable height and lets the last rows scroll out of the
// clipped area. Forcing it back to a block keeps scrollHeight honest.
const VIEWPORT_CONTENT_FIX = "[&_[data-slot=scroll-area-viewport]>div]:block!";

type Props = {
	onSelectGuide: (guideId: string) => void;
};

export function RecentGuidesList({ onSelectGuide }: Props) {
	const { guides, isLoading, error, isSignedOut, refetch } = useRecentGuides();

	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
			<div className="flex shrink-0 items-center justify-between gap-2 px-0.5">
				<span className="text-[11px] font-semibold text-muted-foreground/60">
					Recent guides
				</span>
				{guides.length > 0 && (
					<span className="text-[10px] tabular-nums text-muted-foreground/40">
						{guides.length}
					</span>
				)}
			</div>
			<div className="min-h-0 flex-1 overflow-hidden">
				<RecentGuidesBody
					guides={guides}
					isLoading={isLoading}
					error={error}
					isSignedOut={isSignedOut}
					refetch={refetch}
					onSelectGuide={onSelectGuide}
				/>
			</div>
		</section>
	);
}

function RecentGuidesBody({
	guides,
	isLoading,
	error,
	isSignedOut,
	refetch,
	onSelectGuide,
}: {
	guides: Guide[];
	isLoading: boolean;
	error: Error | null;
	isSignedOut: boolean;
	refetch: () => void;
	onSelectGuide: (guideId: string) => void;
}) {
	if (isLoading) {
		const skeletonKeys = ["skeleton-1", "skeleton-2", "skeleton-3"];
		return (
			<div className="flex flex-col gap-2 px-0.5">
				{skeletonKeys.map((key) => (
					<div
						key={key}
						className="flex shrink-0 flex-col gap-2 rounded-xl border border-border/50 px-3 py-2.5"
					>
						<Skeleton className="h-3.5 w-32 rounded-md" />
						<Skeleton className="h-3 w-24 rounded-md" />
					</div>
				))}
			</div>
		);
	}

	if (isSignedOut) {
		return (
			<EmptyState
				icon={<LogIn className="size-8 text-muted-foreground/30" />}
				message="Sign in to CliqRelay to see your guides."
			/>
		);
	}

	if (error) {
		return (
			<EmptyState
				icon={<FileText className="size-8 text-destructive/30" />}
				message="Couldn't load guides."
				tone="destructive"
				action={
					<Button
						variant="ghost"
						size="xs"
						onClick={() => refetch()}
						className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
					>
						<RotateCw />
						Retry
					</Button>
				}
			/>
		);
	}

	if (guides.length === 0) {
		return (
			<EmptyState
				icon={<FileText className="size-8 text-muted-foreground/30" />}
				message="No guides yet. Start capturing to create one."
			/>
		);
	}

	return (
		<ScrollArea
			type="auto"
			className={cn("h-full min-h-0 min-w-0", VIEWPORT_CONTENT_FIX)}
		>
			<div className="flex min-w-0 flex-col gap-2 px-0.5 pb-1">
				{guides.map((guide, index) => (
					<RecentGuideRow
						key={guide.id}
						guide={guide}
						index={index}
						onSelect={onSelectGuide}
					/>
				))}
			</div>
		</ScrollArea>
	);
}

function RecentGuideRow({
	guide,
	index,
	onSelect,
}: {
	guide: Guide;
	index: number;
	onSelect: (guideId: string) => void;
}) {
	const hasDuration = guide.durationSeconds > 0;

	return (
		<motion.div
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: Math.min(index, 5) * 0.03 }}
			className="min-w-0 shrink-0"
		>
			<Button
				variant="ghost"
				onClick={() => onSelect(guide.id)}
				title={guide.title}
				className="group/guide flex h-auto w-full min-w-0 flex-col items-start justify-start gap-1.5 rounded-xl border border-border/50 bg-card/40 px-3 py-2.5 text-left whitespace-normal hover:border-border hover:bg-muted/50"
			>
				<div className="flex w-full min-w-0 items-center gap-1.5">
					<span className="min-w-0 flex-1 truncate text-[13px] leading-tight font-medium">
						{guide.title}
					</span>
					{guide.isStarred && (
						<Star className="size-3 shrink-0 fill-amber-500 text-amber-500" />
					)}
					<ChevronRight className="size-3 shrink-0 text-muted-foreground/30 transition-transform group-hover/guide:translate-x-0.5 group-hover/guide:text-muted-foreground/70" />
				</div>
				<div className="flex w-full min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground/70">
					<GuideStatusBadge status={guide.status} />
					{hasDuration && (
						<>
							<MetaSeparator />
							<span className="shrink-0">
								{formatGuideDuration(guide.durationSeconds)}
							</span>
						</>
					)}
					<MetaSeparator />
					<span className="truncate">
						{`${formatGuideCreationTime(guide.updatedAt)} ago`}
					</span>
				</div>
			</Button>
		</motion.div>
	);
}

function MetaSeparator() {
	return (
		<span aria-hidden className="shrink-0 text-muted-foreground/30">
			·
		</span>
	);
}

function EmptyState({
	icon,
	message,
	action,
	tone = "muted",
}: {
	icon: ReactNode;
	message: string;
	action?: ReactNode;
	tone?: "muted" | "destructive";
}) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center"
		>
			{icon}
			<p
				className={cn(
					"max-w-44 text-[11px] leading-relaxed",
					tone === "destructive"
						? "text-destructive/80"
						: "text-muted-foreground/60",
				)}
			>
				{message}
			</p>
			{action}
		</motion.div>
	);
}
