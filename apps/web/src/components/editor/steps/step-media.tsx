import { useEffect, useRef, useState } from "react";

import { CameraIcon, ImageIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StepOverlay } from "./step-overlay";

type Props = {
	step: Step;
};

export function StepMedia({ step }: Props) {
	const [loaded, setLoaded] = useState<boolean>(false);
	const [error, setError] = useState<boolean>(false);
	const [showOverlay, setShowOverlay] = useState<boolean>(false);

	const targetElement = step.targetElement;
	const rawClickX = targetElement?.clickX as number | undefined;
	const rawClickY = targetElement?.clickY as number | undefined;
	const vpw = targetElement?.viewportWidth as number | undefined;
	const vph = targetElement?.viewportHeight as number | undefined;

	const hasOverlay =
		rawClickX != null && rawClickY != null && vpw != null && vph != null;
	const hasAspectRatio = vpw != null && vph != null;
	const overlayLeft = hasOverlay ? `${(rawClickX / vpw) * 100}%` : "0%";
	const overlayTop = hasOverlay ? `${(rawClickY / vph) * 100}%` : "0%";
	const containerAspectRatio = hasAspectRatio ? `${vpw} / ${vph}` : undefined;

	const imgRef = useRef<HTMLImageElement>(null);

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

	const media = step.mediaAssets?.[0];

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
											"absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
											loaded ? "opacity-0" : "opacity-100",
										)}
										style={{ filter: "blur(12px)" }}
									/>
								)}
								<img
									ref={imgRef}
									src={media.url}
									alt={media.altText ?? `Step ${step.actionText}`}
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
											left: overlayLeft,
											top: overlayTop,
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
				<div className="relative mb-4 overflow-hidden rounded-sm border bg-muted/20 shadow-xs">
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
										"w-full object-contain transition-opacity duration-500",
										loaded ? "hidden" : "block",
									)}
									style={{ filter: "blur(12px)" }}
								/>
							)}
							<img
								ref={imgRef}
								src={media.url}
								alt={media.altText ?? `Step ${step.actionText}`}
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

	return step.type === "interaction" && step.action ? (
		<div
			className={cn(
				"mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 py-10",
			)}
		>
			<ImageIcon className="h-4 w-4 text-muted-foreground/40" />
			<p className="text-sm text-muted-foreground/60">No screenshot captured</p>
		</div>
	) : (
		<></>
	);
}
