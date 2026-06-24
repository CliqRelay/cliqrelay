import { useState } from "react";

import { CameraIcon, ImageIcon } from "lucide-react";

import { StepOverlay } from "./StepOverlay";
import { cn } from "@/lib/utils";

export function ScreenshotDisplay({
	screenshotUrl,
	thumbnail,
	clickX,
	clickY,
	viewportWidth,
	viewportHeight,
}: {
	screenshotUrl: string;
	thumbnail?: string;
	clickX?: number;
	clickY?: number;
	viewportWidth?: number;
	viewportHeight?: number;
}) {
	const [loaded, setLoaded] = useState(false);
	const [error, setError] = useState(false);

	const hasOverlay =
		clickX != null &&
		clickY != null &&
		viewportWidth != null &&
		viewportHeight != null;
	const hasAspectRatio = viewportWidth != null && viewportHeight != null;
	const containerAspectRatio = hasAspectRatio
		? `${viewportWidth} / ${viewportHeight}`
		: undefined;
	const overlayLeft = hasOverlay ? `${(clickX / viewportWidth) * 100}%` : "0%";
	const overlayTop = hasOverlay ? `${(clickY / viewportHeight) * 100}%` : "0%";

	if (error) {
		return (
			<div className="flex items-center justify-center gap-1.5 rounded-lg border bg-muted/30 py-6">
				<ImageIcon className="size-4 text-muted-foreground/40" />
				<span className="text-[10px] text-muted-foreground/40">
					Screenshot unavailable
				</span>
			</div>
		);
	}

	if (hasAspectRatio) {
		return (
			<div
				className="group relative w-full overflow-hidden rounded-lg border bg-muted/20"
				style={{ aspectRatio: containerAspectRatio }}
			>
				{!loaded && (
					<div className="absolute inset-0 flex items-center justify-center">
						<CameraIcon className="size-5 text-muted-foreground/25" />
					</div>
				)}
				{thumbnail && (
					<img
						src={thumbnail}
						alt=""
						aria-hidden
						className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
							loaded ? "opacity-0" : "opacity-100 animate-pulse"
						}`}
					/>
				)}
				<img
					src={screenshotUrl}
					alt="Screenshot"
					className={cn(
						"absolute inset-0 h-auto w-full object-contain transition-opacity duration-300",
						loaded ? "opacity-100" : "opacity-0",
					)}
					onLoad={() => setLoaded(true)}
					onError={() => setError(true)}
				/>
				{loaded && hasOverlay && (
					<div
						className="pointer-events-none absolute"
						style={{ left: overlayLeft, top: overlayTop }}
					>
						<StepOverlay />
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="relative w-full overflow-hidden rounded-lg border bg-muted/20">
			{!loaded && (
				<div className="flex items-center justify-center py-6">
					<CameraIcon className="size-5 text-muted-foreground/25" />
				</div>
			)}
			{thumbnail && (
				<img
					src={thumbnail}
					alt=""
					aria-hidden
					className={`w-full object-contain transition-opacity duration-300 ${
						loaded ? "hidden" : "block animate-pulse"
					}`}
				/>
			)}
			<img
				src={screenshotUrl}
				alt="Screenshot"
				className={`h-auto w-full object-contain transition-opacity duration-300 ${
					loaded ? "block" : "hidden"
				}`}
				onLoad={() => setLoaded(true)}
				onError={() => setError(true)}
			/>
		</div>
	);
}
