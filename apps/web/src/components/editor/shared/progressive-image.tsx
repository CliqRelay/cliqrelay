import { useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
	src: string;
	thumbnail: string;
	alt: string;
	aspectRatio?: string;
};

export function ProgressiveImage({
	src,
	thumbnail,
	alt,
	aspectRatio = "16/9",
}: Props) {
	const [loaded, setLoaded] = useState<boolean>(false);

	return (
		<div
			style={{ aspectRatio }}
			className="relative overflow-hidden rounded-md border bg-muted/20 shadow-xs"
		>
			<img
				src={thumbnail}
				alt=""
				aria-hidden
				className={cn(
					"absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
					loaded ? "opacity-0" : "opacity-100",
				)}
				style={{ filter: "blur(12px)" }}
			/>
			<img
				src={src}
				alt={alt}
				decoding="async"
				loading="lazy"
				className={cn(
					"absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
					loaded ? "opacity-100" : "opacity-0",
				)}
				onLoad={() => setLoaded(true)}
				onError={() => setLoaded(true)}
			/>
		</div>
	);
}
