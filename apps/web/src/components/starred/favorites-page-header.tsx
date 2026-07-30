import { Star } from "lucide-react";

export function FavoritesPageHeader() {
	return (
		<div className="relative mb-6">
			<div className="flex items-center gap-3">
				<Star className="size-6 text-primary" strokeWidth={1.8} />
				<h1 className="text-[28px] font-semibold tracking-tight text-foreground leading-tight">
					Favorites
				</h1>
			</div>
			<p className="mt-1.5 text-[14px] text-muted-foreground">
				Your favorite guides, quick access to what matters most.
			</p>
		</div>
	);
}
