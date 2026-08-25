import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { api, type Visibility } from "@repo/api-client";

import { CreateGuideDialog } from "@/components/guides/create-guide-dialog";
import { ConfirmActionDialog } from "@/components/guides/guide-confirm-action-dialog";
import { GuideFilterGroup } from "@/components/guides/guide-filter-group";
import { GuidePageHeader } from "@/components/guides/guide-page-header";
import { GuidesList } from "@/components/guides/guides-list";
import { useGuideActions } from "@/components/guides/use-guide-actions";
import { DataPagination } from "@/components/ui/data-pagination";
import { starGuide, unstarGuide } from "@/server-fns/starred-guides";
import { updateGuideVisibility } from "@/server-fns/guides";
import { useGuidesStore, useTeamStore } from "@/stores";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/dashboard/guides")({
	component: Guides,
	pendingComponent: GuidesSkeleton,
});

function GuidesSkeleton() {
	return (
		<div className="dashboard-page__wrapper">
			<GuidePageHeader />

			<div className="flex gap-6">
				<div className="flex-1 flex flex-col justify-between">
					<div className="space-y-4">
						<div className="flex gap-1 p-1 border border-muted-background rounded-lg w-90">
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={i}
									className="h-8 flex-1 animate-pulse rounded-md bg-muted"
								/>
							))}
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="rounded-2xl surface-card p-4 space-y-3">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-1.5">
											<div className="h-5 w-16 animate-pulse rounded-md bg-muted" />
											<div className="h-5 w-20 animate-pulse rounded-md bg-muted/50" />
										</div>
										<div className="size-5 animate-pulse rounded bg-muted" />
									</div>
									<div className="space-y-2">
										<div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
										<div className="h-4 w-full animate-pulse rounded bg-muted/50" />
									</div>
									<div className="flex items-center gap-2 pt-1">
										<div className="h-5 w-14 animate-pulse rounded-md bg-muted" />
										<div className="h-4 w-16 animate-pulse rounded bg-muted/30" />
										<div className="h-4 w-1 animate-pulse rounded bg-muted/20" />
										<div className="h-4 w-20 animate-pulse rounded bg-muted/30" />
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="mt-8 flex justify-center gap-1.5">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="h-9 w-9 animate-pulse rounded-[14px] bg-surface-1 border border-border"
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function Guides() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const activeTeamId = useTeamStore((s) => s.activeTeamId);
	const filter = useGuidesStore((s) => s.filter);
	const setFilter = useGuidesStore((s) => s.setFilter);

	const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [pendingGuideId, setPendingGuideId] = useState<string | null>(null);

	useEffect(() => {
		setCurrentPage(1);
	}, [filter]);

	const invalidateGuides = () => {
		queryClient.invalidateQueries({
			queryKey: api.guides.getGetAllGuidesQueryKey(),
		});
		queryClient.invalidateQueries({
			queryKey: api.guides.getGetStarredGuidesQueryKey(),
		});
	};

	const { confirmAction, setConfirmAction, loading, confirm } = useGuideActions(
		() => invalidateGuides(),
	);

	const statusParam = filter === "all" ? undefined : filter;

	const guidesQuery = api.guides.useGetAllGuides(
		{
			team_id: activeTeamId ?? undefined,
			status: statusParam,
			page: currentPage,
			limit: PAGE_SIZE,
			sort_by: "created_at",
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

	if (guidesQuery.isPending) {
		return <GuidesSkeleton />;
	}

	const guides = guidesQuery.data?.data ?? [];
	const total = guidesQuery.data?.total ?? 0;
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
		if (!guide) return;
		if (guide.isStarred) {
			await unstarGuide({ data: { guideId } });
		} else {
			await starGuide({ data: { guideId } });
		}
		invalidateGuides();
	};

	const handleVisibilityChange = async (
		guideId: string,
		visibility: Visibility,
	) => {
		await updateGuideVisibility({ data: { guideId, visibility } });
		invalidateGuides();
	};

	return (
		<div className="dashboard-page__wrapper">
			<GuidePageHeader />

			<div className="flex gap-6">
				<div className="flex-1 flex flex-col justify-between">
					<div className="space-y-4">
						<GuideFilterGroup filter={filter} onFilterChange={setFilter} />
						<GuidesList
							guides={guides}
							onDelete={handleDelete}
							onStarToggle={handleStarToggle}
							onArchive={handleArchive}
							onPublish={handlePublish}
							onUnpublish={handleUnpublish}
							onUnarchive={handleUnarchive}
							onVisibilityChange={handleVisibilityChange}
						/>
					</div>
					<DataPagination
						currentPage={currentPage}
						totalPages={totalPages}
						onPageChange={setCurrentPage}
					/>
				</div>
			</div>

			<CreateGuideDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onCreated={(guideId) =>
					navigate({ to: "/dashboard/guides/$guideId", params: { guideId } })
				}
			/>

			<ConfirmActionDialog
				open={confirmAction === "delete"}
				title="Delete Guide"
				description="Are you sure you want to delete this guide? You can restore it from trash within 30 days."
				confirmLabel="Delete"
				variant="destructive"
				loading={loading}
				onConfirm={() => {
					if (pendingGuideId) {
						confirm(pendingGuideId);
						setPendingGuideId(null);
					}
				}}
				onCancel={() => {
					setConfirmAction(null);
					setPendingGuideId(null);
				}}
			/>

			<ConfirmActionDialog
				open={confirmAction === "archive"}
				title="Archive Guide"
				description="Are you sure you want to archive this guide? You can unarchive it later."
				confirmLabel="Archive"
				loading={loading}
				onConfirm={() => {
					if (pendingGuideId) {
						confirm(pendingGuideId);
						setPendingGuideId(null);
					}
				}}
				onCancel={() => {
					setConfirmAction(null);
					setPendingGuideId(null);
				}}
			/>

			<ConfirmActionDialog
				open={confirmAction === "publish"}
				title="Publish Guide"
				description="Are you sure you want to publish this guide? It will be visible to your team."
				confirmLabel="Publish"
				loading={loading}
				onConfirm={() => {
					if (pendingGuideId) {
						confirm(pendingGuideId);
						setPendingGuideId(null);
					}
				}}
				onCancel={() => {
					setConfirmAction(null);
					setPendingGuideId(null);
				}}
			/>

			<ConfirmActionDialog
				open={confirmAction === "unpublish"}
				title="Unpublish Guide"
				description="This guide will be returned to draft and no longer visible to others."
				confirmLabel="Unpublish"
				loading={loading}
				onConfirm={() => {
					if (pendingGuideId) {
						confirm(pendingGuideId);
						setPendingGuideId(null);
					}
				}}
				onCancel={() => {
					setConfirmAction(null);
					setPendingGuideId(null);
				}}
			/>

			<ConfirmActionDialog
				open={confirmAction === "unarchive"}
				title="Unarchive Guide"
				description="This guide will be restored to draft status."
				confirmLabel="Unarchive"
				loading={loading}
				onConfirm={() => {
					if (pendingGuideId) {
						confirm(pendingGuideId);
						setPendingGuideId(null);
					}
				}}
				onCancel={() => {
					setConfirmAction(null);
					setPendingGuideId(null);
				}}
			/>
		</div>
	);
}
