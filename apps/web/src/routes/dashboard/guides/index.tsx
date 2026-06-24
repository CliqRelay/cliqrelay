import { useState } from "react";

import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { CreateGuideDialog, GuideList } from "@/components/guides";
import { Button } from "@/components/ui/button";
import { getAllGuides } from "@/server-fns/guides";

export const Route = createFileRoute("/dashboard/guides/")({
	component: Guides,
	loader: async ({ abortController }) => {
		try {
			const guides = await getAllGuides({
				signal: abortController.signal,
			});
			return { guides };
		} catch (error) {
			console.error(error);
			return { guides: [] };
		}
	},
	pendingComponent: GuidesSkeleton,
});

function GuidesSkeleton() {
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

function Guides() {
	const { guides } = Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();

	const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">My Guides</h1>
					<p className="text-sm text-muted-foreground">
						Manage your documentation guides
					</p>
				</div>
				<Button variant="default" onClick={() => setCreateDialogOpen(true)}>
					<Plus className="mr-2 h-4 w-4" />
					New Guide
				</Button>
			</div>
			<GuideList
				guides={guides}
				onCreateGuide={() => setCreateDialogOpen(true)}
				onAction={(action: string) => {
					if (action === "delete") {
						navigate({ to: "/dashboard/guides", replace: true });
					} else {
						router.invalidate();
					}
				}}
			/>
			<CreateGuideDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onCreated={(guideId) =>
					navigate({ to: "/dashboard/guides/$guideId", params: { guideId } })
				}
			/>
		</div>
	);
}
