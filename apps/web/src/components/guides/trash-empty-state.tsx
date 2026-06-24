import { Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function TrashEmptyState() {
	return (
		<Card className="w-full">
			<CardContent className="flex flex-col items-center justify-center py-16">
				<div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
					<Trash2 className="h-12 w-12 text-muted-foreground" />
				</div>
				<h2 className="mb-2 text-xl font-semibold">Trash is empty</h2>
				<p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
					Deleted guides will appear here. You can restore them within 30
					days before they are permanently deleted.
				</p>
			</CardContent>
		</Card>
	);
}
