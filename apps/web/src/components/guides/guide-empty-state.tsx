import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GuideEmptyStateProps = {
	onCreateGuide?: () => void;
};

export function GuideEmptyState({ onCreateGuide }: GuideEmptyStateProps) {
	return (
		<Card className="w-full">
			<CardContent className="flex flex-col items-center justify-center py-16">
				<div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
					<FileText className="h-12 w-12 text-muted-foreground" />
				</div>
				<h2 className="mb-2 text-xl font-semibold">No guides yet</h2>
				<p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
					Create your first guide to start documenting workflows. Your guides
					will appear here once you create them.
				</p>
				<Button onClick={onCreateGuide}>
					<Plus className="mr-2 h-4 w-4" />
					Create your first guide
				</Button>
			</CardContent>
		</Card>
	);
}
