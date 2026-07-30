import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import type { Guide } from "@repo/api-client";
import { api } from "@repo/api-client";

import { ConfirmActionDialog } from "@/components/guides/guide-confirm-action-dialog";
import { GuidesList } from "@/components/guides/guides-list";
import { TrashPageHeader } from "@/components/trash/trash-page-header";
import { DataPagination } from "@/components/ui/data-pagination";
import { useTeamStore } from "@/stores/team-store";
import { getCsrfTokenHeader } from "@/utils/http.utils";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/dashboard/trash")({
	component: TrashGuides,
	pendingComponent: TrashSkeleton,
});

function TrashSkeleton() {
	return (
		<div className="dashboard-page__wrapper space-y-4">
			<div className="h-8 w-48 animate-pulse rounded bg-muted" />
			<div className="flex gap-6">
				<div className="flex-1 min-w-0">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
						{[...Array(6)].map((_, i) => (
							<div
								key={i}
								className="rounded-2xl surface-card border border-border p-4 flex flex-col gap-3"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex items-center gap-1.5">
										<div className="h-5 w-14 animate-pulse rounded-md bg-muted/50" />
									</div>
									<div className="size-7 animate-pulse rounded-lg bg-muted/30" />
								</div>
								<div className="space-y-2 flex-1">
									<div className="h-4 w-full animate-pulse rounded bg-muted/50" />
									<div className="h-4 w-2/3 animate-pulse rounded bg-muted/30" />
								</div>
								<div className="flex items-center gap-2 pt-1">
									<div className="h-5 w-14 animate-pulse rounded-md bg-muted/40" />
									<div className="size-3 animate-pulse rounded bg-muted/30" />
									<div className="h-3 w-10 animate-pulse rounded bg-muted/30" />
									<div className="size-1 animate-pulse rounded-full bg-muted/30" />
									<div className="h-3 w-14 animate-pulse rounded bg-muted/30" />
									<div className="ml-auto size-7 animate-pulse rounded-lg bg-muted/30" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function TrashGuides() {
	const queryClient = useQueryClient();
	const activeTeamId = useTeamStore((s) => s.activeTeamId);

	const [currentPage, setCurrentPage] = useState<number>(1);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [deleteDialogGuideId, setDeleteDialogGuideId] = useState<string | null>(
		null,
	);

	const guidesQuery = api.guides.useGetAllGuides(
		{
			team_id: activeTeamId ?? undefined,
			status: "deleted",
			page: currentPage,
			limit: PAGE_SIZE,
		},
		{
			query: { placeholderData: (prev) => prev, enabled: !!activeTeamId },
			request: { credentials: "include" },
		},
	);

	const guides = guidesQuery.data?.data ?? [];
	const total = guidesQuery.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const invalidateGuides = () => {
		queryClient.invalidateQueries({
			queryKey: api.guides.getGetAllGuidesQueryKey(),
		});
		queryClient.invalidateQueries({
			queryKey: api.guides.getGetGuidesCountQueryKey(),
		});
	};

	const restoreMutation = api.guides.useRestoreGuide({
		request: {
			credentials: "include",
			headers: {
				...getCsrfTokenHeader(),
			},
		},
	});

	const permanentlyDeleteMutation = api.guides.usePermanentlyDeleteGuide({
		request: {
			credentials: "include",
			headers: {
				...getCsrfTokenHeader(),
			},
		},
	});

	const bulkMutation = api.guides.useBulkGuidesAction({
		request: {
			credentials: "include",
			headers: {
				...getCsrfTokenHeader(),
			},
		},
	});

	const handleRestore = async (guideId: string) => {
		await restoreMutation.mutateAsync({ id: guideId });
		setSelectedIds((prev) => prev.filter((id) => id !== guideId));
		const newTotalPages = Math.max(
			1,
			Math.ceil(Math.max(0, total - 1) / PAGE_SIZE),
		);
		if (currentPage > newTotalPages) {
			setCurrentPage(newTotalPages);
		}
		invalidateGuides();
	};

	const handleDeletePermanently = (guideId: string) => {
		setDeleteDialogGuideId(guideId);
	};

	const handleBulkRestore = async () => {
		if (!activeTeamId || selectedIds.length === 0) return;
		await bulkMutation.mutateAsync({
			data: { teamId: activeTeamId, ids: selectedIds },
			params: { action: "restore" },
		});
		setSelectedIds([]);
		const newTotalPages = Math.max(
			1,
			Math.ceil(Math.max(0, total - selectedIds.length) / PAGE_SIZE),
		);
		if (currentPage > newTotalPages) {
			setCurrentPage(newTotalPages);
		}
		invalidateGuides();
	};

	const handleBulkDelete = () => {
		setDeleteDialogGuideId("__bulk__");
	};

	const confirmPermanentDelete = async () => {
		if (!deleteDialogGuideId) {
			return;
		}

		const deletedCount =
			deleteDialogGuideId === "__bulk__" ? selectedIds.length : 1;

		if (deleteDialogGuideId === "__bulk__") {
			if (!activeTeamId || selectedIds.length === 0) {
				return;
			}
			await bulkMutation.mutateAsync({
				data: { teamId: activeTeamId, ids: selectedIds },
				params: { action: "permanently-delete" },
			});
			setSelectedIds([]);
		} else {
			await permanentlyDeleteMutation.mutateAsync({
				id: deleteDialogGuideId,
			});
			setSelectedIds((prev) => prev.filter((id) => id !== deleteDialogGuideId));
		}

		setDeleteDialogGuideId(null);
		const newTotalPages = Math.max(
			1,
			Math.ceil(Math.max(0, total - deletedCount) / PAGE_SIZE),
		);
		if (currentPage > newTotalPages) {
			setCurrentPage(newTotalPages);
		}
		invalidateGuides();
	};

	const cancelPermanentDelete = () => {
		setDeleteDialogGuideId(null);
	};

	const isPerformingBulk = bulkMutation.isPending;

	const storeLoaded = useTeamStore((s) => s.loaded);

	if (!storeLoaded || guidesQuery.isLoading) {
		return <TrashSkeleton />;
	}

	return (
		<div className="dashboard-page__wrapper">
			<TrashPageHeader
				selectedCount={selectedIds.length}
				totalCount={guides.length}
				selectable={true}
				onSelectAll={() =>
					setSelectedIds((prev) =>
						prev.length === guides.length ? [] : guides.map((g: Guide) => g.id),
					)
				}
				onRestore={handleBulkRestore}
				onDeletePermanently={handleBulkDelete}
			/>

			<div className="flex gap-6">
				<div className="flex-1 min-w-0">
					<GuidesList
						guides={guides}
						selectable={true}
						selectedIds={selectedIds}
						onToggleSelect={(id) =>
							setSelectedIds((prev) =>
								prev.includes(id)
									? prev.filter((x) => x !== id)
									: [...prev, id],
							)
						}
						onRestore={handleRestore}
						onDeletePermanently={handleDeletePermanently}
						renderEmpty={() => (
							<div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
								No items in trash.
							</div>
						)}
					/>
					<DataPagination
						currentPage={currentPage}
						totalPages={totalPages}
						onPageChange={(page) => {
							setCurrentPage(page);
							setSelectedIds([]);
						}}
					/>
				</div>
			</div>

			<ConfirmActionDialog
				open={deleteDialogGuideId !== null}
				title={
					deleteDialogGuideId === "__bulk__"
						? "Permanently Delete Guides"
						: "Permanently Delete Guide"
				}
				description={
					deleteDialogGuideId === "__bulk__"
						? `Are you sure you want to permanently delete ${selectedIds.length} guides? This action cannot be undone.`
						: "Are you sure you want to permanently delete this guide? This action cannot be undone."
				}
				confirmLabel="Delete Permanently"
				variant="destructive"
				loading={permanentlyDeleteMutation.isPending || isPerformingBulk}
				onConfirm={confirmPermanentDelete}
				onCancel={cancelPermanentDelete}
			/>
		</div>
	);
}
