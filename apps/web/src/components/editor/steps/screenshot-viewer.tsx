import { useState } from "react";
import { CameraIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScreenshotViewerProps = {
	src: string | null;
	alt?: string;
	actionArea?: {
		x: number;
		y: number;
		width: number;
		height: number;
	} | null;
};

export function ScreenshotViewer({
	src,
	alt = "Screenshot",
	actionArea,
}: ScreenshotViewerProps) {
	const [zoomed, setZoomed] = useState(false);

	if (!src) {
		return (
			<div className="flex items-center justify-center rounded-lg bg-muted/30 py-16">
				<div className="flex flex-col items-center gap-2 text-center">
					<span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
						<CameraIcon className="h-5 w-5 text-muted-foreground" />
					</span>
					<p className="text-sm text-muted-foreground">No screenshot</p>
				</div>
			</div>
		);
	}

	const zoomStyle =
		zoomed && actionArea
			? {
					transform: `scale(1.5) translate(${-actionArea.x + 50}px, ${-actionArea.y + 50}px)`,
					transformOrigin: "top left",
				}
			: {};

	return (
		<div className="relative">
			<div
				className={cn(
					"relative cursor-zoom-in overflow-hidden rounded-lg",
					zoomed && "cursor-zoom-out",
				)}
				onClick={() => setZoomed(!zoomed)}
			>
				<img
					src={src}
					alt={alt}
					className={cn(
						"h-auto w-full object-contain transition-transform duration-300 ease-in-out",
					)}
					style={zoomStyle}
				/>
			</div>
			<Button
				type="button"
				variant="secondary"
				size="sm"
				className="absolute bottom-2 right-2 gap-1 text-xs shadow-xs"
				onClick={(e) => {
					e.stopPropagation();
					setZoomed(!zoomed);
				}}
			>
				{zoomed ? (
					<ZoomOutIcon className="h-3 w-3" />
				) : (
					<ZoomInIcon className="h-3 w-3" />
				)}
				{zoomed ? "Fit" : "Zoom"}
			</Button>
		</div>
	);
}
