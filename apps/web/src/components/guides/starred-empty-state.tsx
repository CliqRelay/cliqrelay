import { Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function StarredEmptyState() {
	return (
		<Card className="w-full">
			<CardContent className="flex flex-col items-center justify-center py-16">
				<div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
					<Star className="h-12 w-12 text-muted-foreground" />
				</div>
				<h2 className="mb-2 text-xl font-semibold">No starred guides</h2>
				<p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
					Star guides from your guides page to bookmark them for quick
					access. Starred guides will appear here.
				</p>
			</CardContent>
		</Card>
	);
}
