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
import { useGuidesStore } from "@/store/guides-store";
import { useTeamStore } from "@/stores/team-store";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/dashboard/guides")({
	component: Guides,
	pendingComponent: GuidesSkeleton,
});

function GuidesSkeleton() {
	return (
		<div className="w-full p-8 space-y-4">
			<div className="h-8 w-48 animate-pulse rounded bg-muted" />
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="h-30 animate-pulse rounded-[20px] bg-muted/50"
					/>
				))}
			</div>
			<div className="h-64 animate-pulse rounded-[20px] bg-muted/30" />
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset page on filter change
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
