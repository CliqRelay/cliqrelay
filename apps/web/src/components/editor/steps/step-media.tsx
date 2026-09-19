import { useEffect, useRef, useState } from "react";

import {
	CameraIcon,
	ImageIcon,
	ImageUpIcon,
	Loader2Icon,
	UploadIcon,
} from "lucide-react";

import type { Step } from "@repo/api-client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MediaLayoutTarget } from "@/models";
import { resolveMediaLayout } from "@/utils/media.utils";
import { stepSupportsMedia } from "@/utils/steps.utils";
import { StepMediaToolbar, StepMediaToolbarButton } from "./step-media-toolbar";
import { StepOverlay } from "./step-overlay";

type Props = {
	step: Step;
	onReplaceMedia?: () => void;
	isReplacing?: boolean;
};

export function StepMedia({ step, onReplaceMedia, isReplacing }: Props) {
	const [loaded, setLoaded] = useState<boolean>(false);
	const [error, setError] = useState<boolean>(false);
	const [showOverlay, setShowOverlay] = useState<boolean>(false);

	const media = step.mediaAssets?.[0];
	const { aspectRatio: containerAspectRatio, overlay } = resolveMediaLayout(
		step.targetElement as MediaLayoutTarget | undefined,
		media,
	);
	const hasAspectRatio = containerAspectRatio != null;
	const hasOverlay = overlay != null;

	const imgRef = useRef<HTMLImageElement>(null);
	const mediaAltText =
		media?.altText ??
		step.actionText ??
		step.canvasContent?.headingText ??
		"Step screenshot";

	useEffect(() => {
		if (imgRef.current?.complete) {
			setLoaded(true);
			setShowOverlay(true);
		}
	}, []);

	const handleImageLoad = () => {
		setLoaded(true);
		setShowOverlay(true);
	};

	const mediaToolbar = onReplaceMedia && (
		<StepMediaToolbar visible={isReplacing}>
			<StepMediaToolbarButton
				label={isReplacing ? "Uploading…" : "Replace screenshot"}
				disabled={isReplacing}
				onClick={onReplaceMedia}
				icon={
					isReplacing ? (
						<Loader2Icon className="animate-spin" />
					) : (
						<ImageUpIcon />
					)
				}
			/>
		</StepMediaToolbar>
	);

	if (media) {
		const hasScreenshot = media.mimeType?.startsWith("image/");
		const hasGif = media.mimeType?.startsWith("image/gif");

		if ((hasScreenshot || hasGif) && media.url) {
			if (hasAspectRatio) {
				return (
					<div
						className="group relative mb-4 overflow-hidden rounded-sm border bg-muted/20 shadow-xs"
						style={{ aspectRatio: containerAspectRatio }}
					>
						{mediaToolbar}
						{!loaded && (
							<div className="absolute inset-0 flex items-center justify-center">
								<Skeleton className="absolute inset-0 rounded-none" />
								<CameraIcon className="relative h-8 w-8 text-muted-foreground/20" />
							</div>
						)}
						{!error && (
							<>
								{media.thumbnail && (
									<img
										src={media.thumbnail}
										alt=""
										aria-hidden
										className={cn(
											"absolute inset-0 h-full w-full object-contain transition-opacity duration-500 blur-md",
											loaded ? "opacity-0" : "opacity-100",
										)}
									/>
								)}
								<img
									ref={imgRef}
									src={media.url}
									alt={mediaAltText}
									className={cn(
										"absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
										!loaded && !media.thumbnail && "opacity-0",
										media.thumbnail && (loaded ? "opacity-100" : "opacity-0"),
										!media.thumbnail && loaded && "opacity-100",
									)}
									onLoad={handleImageLoad}
									onError={() => {
										setLoaded(true);
										setError(true);
									}}
								/>
								{hasOverlay && (
									<div
										className="pointer-events-none absolute"
										style={{
											left: overlay.left,
											top: overlay.top,
											display: showOverlay ? undefined : "none",
										}}
									>
										<StepOverlay />
									</div>
								)}
							</>
						)}
						{error && (
							<div className="flex aspect-video items-center justify-center gap-2">
								<ImageIcon className="h-4 w-4 text-muted-foreground/40" />
								<p className="text-sm text-muted-foreground/60">
									Failed to load screenshot
								</p>
							</div>
						)}
					</div>
				);
			}

			return (
				<div className="group relative mb-4 overflow-hidden rounded-sm border bg-muted/20 shadow-xs">
					{mediaToolbar}
					{!loaded && (
						<div className="flex items-center justify-center py-6">
							<CameraIcon className="h-8 w-8 text-muted-foreground/20" />
						</div>
					)}
					{!error && (
						<>
							{media.thumbnail && (
								<img
									src={media.thumbnail}
									alt=""
									aria-hidden
									className={cn(
										"w-full object-contain transition-opacity duration-500 blur-md",
										loaded ? "hidden" : "block",
									)}
								/>
							)}
							<img
								ref={imgRef}
								src={media.url}
								alt={mediaAltText}
								className={cn(
									"w-full object-contain transition-opacity duration-500",
									!loaded && !media.thumbnail && "opacity-0",
									media.thumbnail && (loaded ? "opacity-100" : "opacity-0"),
									!media.thumbnail && loaded && "opacity-100",
								)}
								onLoad={handleImageLoad}
								onError={() => {
									setLoaded(true);
									setError(true);
								}}
							/>
						</>
					)}
					{error && (
						<div className="flex items-center justify-center gap-2 py-6">
							<ImageIcon className="h-4 w-4 text-muted-foreground/40" />
							<p className="text-sm text-muted-foreground/60">
								Failed to load screenshot
							</p>
						</div>
					)}
				</div>
			);
		}
	}

	if (!stepSupportsMedia(step) || (step.type === "interaction" && !step.action)) {
		return <></>;
	}

	if (onReplaceMedia) {
		return (
			<div className="mb-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 py-8">
				<p className="text-sm text-muted-foreground/60">No screenshot captured</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={isReplacing}
					onClick={(e) => {
						e.stopPropagation();
						onReplaceMedia();
					}}
				>
					{isReplacing ? (
						<Loader2Icon className="h-3.5 w-3.5 animate-spin" />
					) : (
						<UploadIcon className="h-3.5 w-3.5" />
					)}
					{isReplacing ? "Uploading…" : "Upload screenshot"}
				</Button>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 py-10",
			)}
		>
			<ImageIcon className="h-4 w-4 text-muted-foreground/40" />
			<p className="text-sm text-muted-foreground/60">No screenshot captured</p>
		</div>
	);
}
