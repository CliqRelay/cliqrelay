import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { GuideList, StarredEmptyState } from "@/components/guides";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStarredGuides } from "@/server-fns/guides";

export const Route = createFileRoute("/dashboard/starred")({
	component: StarredGuides,
	loader: async () => {
		const guides = await getStarredGuides();
		return { guides };
	},
	pendingComponent: StarredGuidesSkeleton,
	errorComponent: StarredGuidesError,
});

function StarredGuidesSkeleton() {
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

function StarredGuidesError({ error }: { error: Error }) {
	const router = useRouter();

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Starred Guides</h1>
					<p className="text-sm text-muted-foreground">
						Guides you&apos;ve bookmarked for quick access
					</p>
				</div>
			</div>
			<Card className="w-full">
				<CardContent className="flex flex-col items-center justify-center py-16">
					<div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
						<AlertTriangle className="h-12 w-12 text-destructive" />
					</div>
					<h2 className="mb-2 text-xl font-semibold">
						Failed to load starred guides
					</h2>
					<p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
						{error?.message ??
							"An unexpected error occurred. Please try again."}
					</p>
					<Button onClick={() => router.invalidate()}>
						<RefreshCw className="mr-2 h-4 w-4" />
						Try again
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function StarredGuides() {
	const { guides } = Route.useLoaderData();
	const router = useRouter();

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Starred Guides</h1>
					<p className="text-sm text-muted-foreground">
						Guides you&apos;ve bookmarked for quick access
					</p>
				</div>
			</div>
			{guides.length === 0 ? (
				<StarredEmptyState />
			) : (
				<GuideList
					guides={guides}
					showFilterBar={false}
					onAction={() => router.invalidate()}
				/>
			)}
		</div>
	);
}
