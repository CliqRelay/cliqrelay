import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarButtonProps = {
	isStarred: boolean;
	onToggle: () => void;
};

export function StarButton({ isStarred, onToggle }: StarButtonProps) {
	return (
		<button
			type="button"
			className={cn(
				"relative flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
				isStarred
					? "bg-amber-50 text-amber-500 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20"
					: "text-muted-foreground/30 hover:text-muted-foreground/70 hover:bg-surface-hover",
			)}
			aria-label={isStarred ? "Unstar guide" : "Star guide"}
			onClick={(e) => {
				e.stopPropagation();
				e.preventDefault();
				onToggle();
			}}
		>
			<Star
				className={cn(
					"size-4 transition-all duration-200",
					isStarred && "fill-amber-500",
				)}
			/>
		</button>
	);
}
