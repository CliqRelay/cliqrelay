import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw, Star } from "lucide-react";

import { api, type Visibility } from "@repo/api-client";

import { ConfirmActionDialog } from "@/components/guides/guide-confirm-action-dialog";
import { GuidesList } from "@/components/guides/guides-list";
import { useGuideActions } from "@/components/guides/use-guide-actions";
import { FavoritesPageHeader } from "@/components/starred/favorites-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataPagination } from "@/components/ui/data-pagination";
import { starGuide, unstarGuide } from "@/server-fns/starred-guides";
import { updateGuideVisibility } from "@/server-fns/guides";
import { useTeamStore } from "@/stores/team-store";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/dashboard/starred")({
	component: StarredGuides,
	pendingComponent: StarredGuidesSkeleton,
	errorComponent: StarredGuidesError,
});

function StarredGuidesSkeleton() {
	return (
		<div className="dashboard-page__wrapper space-y-4">
			<div className="h-8 w-48 animate-pulse rounded bg-muted" />
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="h-32 animate-pulse rounded-[20px] bg-card" />
				))}
			</div>
		</div>
	);
}

function StarredGuidesError({ error }: { error: Error }) {
	const router = useRouter();

	return (
		<div className="dashboard-page__wrapper">
			<Card className="w-full">
				<CardContent className="flex flex-col items-center justify-center py-16">
					<div className="mb-6 flex size-24 items-center justify-center rounded-full bg-muted">
						<AlertTriangle className="size-12 text-destructive" />
					</div>
					<h2 className="mb-2 text-xl font-semibold">
						Failed to load favorites
					</h2>
					<p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
						{error?.message ??
							"An unexpected error occurred. Please try again."}
					</p>
					<Button onClick={() => router.invalidate()}>
						<RefreshCw className="mr-2 size-4" />
						Try again
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function StarredGuides() {
	const queryClient = useQueryClient();
	const activeTeamId = useTeamStore((s) => s.activeTeamId);

	const [currentPage, setCurrentPage] = useState<number>(1);
	const [pendingGuideId, setPendingGuideId] = useState<string | null>(null);

	const invalidateStarred = () => {
		queryClient.invalidateQueries({
			queryKey: api.guides.getGetStarredGuidesQueryKey(),
		});
		queryClient.invalidateQueries({
			queryKey: api.guides.getGetAllGuidesQueryKey(),
		});
	};

	const { confirmAction, setConfirmAction, loading, confirm } = useGuideActions(
		() => invalidateStarred(),
	);

	const starredQuery = api.guides.useGetStarredGuides(
		{
			team_id: activeTeamId ?? undefined,
			page: currentPage,
			limit: PAGE_SIZE,
		},
		{
			query: {
				placeholderData: (prev) => prev,
				enabled: !!activeTeamId,
			},
			request: {
				credentials: "include",
			},
		},
	);

	if (starredQuery.isPending) {
		return <StarredGuidesSkeleton />;
	}

	const guides = starredQuery.data?.data ?? [];
	const total = starredQuery.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const handleDelete = (guideId: string) => {
		setPendingGuideId(guideId);
		setConfirmAction("delete");
	};

	const handleArchive = (guideId: string) => {
		setPendingGuideId(guideId);
		setConfirmAction("archive");
	};

	const handlePublish = (guideId: string) => {
		setPendingGuideId(guideId);
		setConfirmAction("publish");
	};

	const handleUnpublish = (guideId: string) => {
		setPendingGuideId(guideId);
		setConfirmAction("unpublish");
	};

	const handleUnarchive = (guideId: string) => {
		setPendingGuideId(guideId);
		setConfirmAction("unarchive");
	};

	const handleStarToggle = async (guideId: string) => {
		const guide = guides.find((g) => g.id === guideId);
		if (!guide) {
			return;
		}
		if (guide.isStarred) {
			await unstarGuide({ data: { guideId } });
		} else {
			await starGuide({ data: { guideId } });
		}
		invalidateStarred();
	};

	const handleVisibilityChange = async (
		guideId: string,
		visibility: Visibility,
	) => {
		await updateGuideVisibility({ data: { guideId, visibility } });
		invalidateStarred();
	};

	const handleConfirm = () => {
		if (pendingGuideId) {
			confirm(pendingGuideId);
			setPendingGuideId(null);
		}
	};

	const handleCancel = () => {
		setConfirmAction(null);
		setPendingGuideId(null);
	};

	return (
		<div className="dashboard-page__wrapper">
			<FavoritesPageHeader />

			<div className="flex gap-6">
				<div className="flex-1 flex flex-col justify-between min-w-0">
					<div className="space-y-4">
						<GuidesList
							guides={guides}
							onDelete={handleDelete}
							onStarToggle={handleStarToggle}
							onArchive={handleArchive}
							onPublish={handlePublish}
							onUnpublish={handleUnpublish}
							onUnarchive={handleUnarchive}
							onVisibilityChange={handleVisibilityChange}
							renderEmpty={() => (
								<Card className="w-full">
									<CardContent className="flex flex-col items-center justify-center py-16">
										<div className="mb-6 flex size-24 items-center justify-center rounded-full bg-muted">
											<Star className="size-12" />
										</div>
										<h2 className="mb-2 text-xl font-semibold">
											No favorites yet
										</h2>
										<p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
											Star guides from your guides page to bookmark them for
											quick access.
										</p>
									</CardContent>
								</Card>
							)}
						/>
					</div>
					<DataPagination
						currentPage={currentPage}
						totalPages={totalPages}
						onPageChange={setCurrentPage}
					/>
				</div>
			</div>

			<ConfirmActionDialog
				open={confirmAction === "delete"}
				title="Delete Guide"
				description="Are you sure you want to delete this guide? You can restore it from trash within 30 days."
				confirmLabel="Delete"
				variant="destructive"
				loading={loading}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>

			<ConfirmActionDialog
				open={confirmAction === "archive"}
				title="Archive Guide"
				description="Are you sure you want to archive this guide? You can unarchive it later."
				confirmLabel="Archive"
				loading={loading}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>

			<ConfirmActionDialog
				open={confirmAction === "publish"}
				title="Publish Guide"
				description="Are you sure you want to publish this guide? It will be visible to your team."
				confirmLabel="Publish"
				loading={loading}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>

			<ConfirmActionDialog
				open={confirmAction === "unpublish"}
				title="Unpublish Guide"
				description="This guide will be returned to draft and no longer visible to others."
				confirmLabel="Unpublish"
				loading={loading}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>

			<ConfirmActionDialog
				open={confirmAction === "unarchive"}
				title="Unarchive Guide"
				description="This guide will be restored to draft status."
				confirmLabel="Unarchive"
				loading={loading}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>
		</div>
	);
}
