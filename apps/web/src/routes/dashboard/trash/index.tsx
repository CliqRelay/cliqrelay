import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Info } from "lucide-react";

import { GuideList, TrashEmptyState } from "@/components/guides";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getTrashGuides } from "@/server-fns/guides";

export const Route = createFileRoute("/dashboard/trash")({
	component: TrashGuides,
	loader: async () => {
		const guides = await getTrashGuides();
		return { guides };
	},
	pendingComponent: TrashSkeleton,
});

function TrashSkeleton() {
	return (
		<div className="p-6 space-y-4">
			<div className="h-8 w-48 animate-pulse rounded bg-muted" />
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						className="h-32 animate-pulse rounded-xl border bg-card shadow-sm"
					/>
				))}
			</div>
		</div>
	);
}

function TrashGuides() {
	const { guides } = Route.useLoaderData();
	const navigate = useNavigate();

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Trash</h1>
					<p className="text-sm text-muted-foreground">
						Deleted guides can be restored or permanently deleted
					</p>
				</div>
			</div>
			{guides.length === 0 ? (
				<TrashEmptyState />
			) : (
				<div className="space-y-4">
					<Alert className="w-full flex flex-row justify-center items-center gap-4">
						<span className="text-xl">
							<Info size={20} />
						</span>
						<AlertDescription>
							<span>
								Guides in the trash for more than
								<span className="ml-1 font-bold">30 days</span> will be deleted
								forever.
							</span>
						</AlertDescription>
					</Alert>
					<GuideList
						guides={guides}
						showFilterBar={false}
						variant="trash"
						onAction={() => navigate({ to: "/dashboard/trash", replace: true })}
					/>
				</div>
			)}
		</div>
	);
}
