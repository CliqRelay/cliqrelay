import type { ReactNode } from "react";

import { FileText } from "lucide-react";

import type { Guide, Visibility } from "@repo/api-client";

import { Card, CardContent } from "@/components/ui/card";
import { GuideCard } from "./guide-card";

type Props = {
	guides: Guide[];
	onDelete?: (guideId: string) => void;
	onStarToggle?: (guideId: string) => void;
	onArchive?: (guideId: string) => void;
	onPublish?: (guideId: string) => void;
	onUnpublish?: (guideId: string) => void;
	onUnarchive?: (guideId: string) => void;
	onVisibilityChange?: (guideId: string, visibility: Visibility) => void;
	renderEmpty?: () => ReactNode;
	selectable?: boolean;
	selectedIds?: string[];
	onToggleSelect?: (guideId: string) => void;
	onRestore?: (guideId: string) => void;
	onDeletePermanently?: (guideId: string) => void;
};

export function GuidesList({
	guides,
	onDelete,
	onStarToggle,
	onArchive,
	onPublish,
	onUnpublish,
	onUnarchive,
	onVisibilityChange,
	renderEmpty,
	selectable,
	selectedIds,
	onToggleSelect,
	onRestore,
	onDeletePermanently,
}: Props) {
	if (guides.length === 0) {
		if (renderEmpty) {
			return renderEmpty();
		}
		return (
			<Card className="w-full">
				<CardContent className="flex flex-col items-center justify-center py-16">
					<div className="mb-6 flex size-24 items-center justify-center rounded-full bg-muted">
						<FileText className="size-12 text-muted-foreground" />
					</div>
					<h2 className="mb-2 text-xl font-semibold">No guides yet</h2>
					<p className="max-w-sm text-center text-sm text-muted-foreground">
						Create your first guide to get started.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
			{guides.map((guide) => (
				<GuideCard
					key={guide.id}
					guide={guide}
					onDelete={onDelete}
					onStarToggle={onStarToggle}
					onArchive={onArchive}
					onPublish={onPublish}
					onUnpublish={onUnpublish}
					onUnarchive={onUnarchive}
					onVisibilityChange={onVisibilityChange}
					selectable={selectable}
					selected={selectedIds?.includes(guide.id)}
					onToggleSelect={onToggleSelect}
					onRestore={onRestore}
					onDeletePermanently={onDeletePermanently}
				/>
			))}
		</div>
	);
}
