import type { Guide } from "@repo/api-client";

import { GuideCard } from "./guide-card";
import { GuideEmptyState } from "./guide-empty-state";
import { GuideFilterBar } from "./guide-filter-bar";
import { useFilteredGuides } from "./use-filtered-guides";

interface Props {
	guides: Guide[];
	onCreateGuide?: () => void;
	onAction?: (action: string) => void;
	showFilterBar?: boolean;
	variant?: "default" | "trash";
}

export function GuideList({ guides, onCreateGuide, onAction, showFilterBar = true, variant = "default" }: Props) {
	const filteredGuides = useFilteredGuides(guides);

	return (
		<div className="space-y-6">
			{showFilterBar && <GuideFilterBar />}
			{filteredGuides.length === 0 ? (
				<GuideEmptyState onCreateGuide={onCreateGuide} />
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredGuides.map((guide) => (
						<GuideCard key={guide.id} guide={guide} onAction={onAction} variant={variant} />
					))}
				</div>
			)}
		</div>
	);
}
