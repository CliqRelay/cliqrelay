import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import type { Guide } from "@repo/api-client";
import { api } from "@repo/api-client";

import { ConfirmActionDialog } from "@/components/guides/guide-confirm-action-dialog";
import { TrashPageHeader } from "@/components/trash/trash-page-header";
import { TrashSidebar } from "@/components/trash/trash-sidebar";
import { TrashTable } from "@/components/trash/trash-table";
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
					<div className="rounded-[20px] overflow-hidden bg-surface-1 border border-border">
						<div className="p-4 space-y-3">
							{[...Array(5)].map((_, i) => (
								<div key={i} className="flex items-center gap-4">
									<div className="size-4 rounded animate-pulse bg-muted/50" />
									<div className="size-11 rounded-[10px] animate-pulse bg-muted/30" />
									<div className="flex-1 h-4 rounded animate-pulse bg-muted/50" />
									<div className="w-16 h-4 rounded animate-pulse bg-muted/30" />
									<div className="w-24 h-4 rounded animate-pulse bg-muted/30" />
									<div className="w-20 h-4 rounded animate-pulse bg-muted/30" />
								</div>
							))}
						</div>
					</div>
				</div>
				<div className="hidden xl:block w-72 shrink-0">
					<div className="rounded-[20px] p-6 bg-surface-1 border border-(--trash-card-border)">
						<div className="flex flex-col items-center gap-3">
							<div className="size-14 rounded-full animate-pulse bg-muted/30" />
							<div className="w-16 h-10 rounded animate-pulse bg-muted/50" />
							<div className="w-24 h-4 rounded animate-pulse bg-muted/30" />
						</div>
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
				onRestore={handleBulkRestore}
				onDeletePermanently={handleBulkDelete}
			/>

			<div className="flex gap-6">
				<div className="flex-1 min-w-0">
					<TrashTable
						guides={guides}
						selectedIds={selectedIds}
						onToggleSelect={(id) =>
							setSelectedIds((prev) =>
								prev.includes(id)
									? prev.filter((x) => x !== id)
									: [...prev, id],
							)
						}
						onToggleAll={() =>
							setSelectedIds((prev) =>
								prev.length === guides.length
									? []
									: guides.map((g: Guide) => g.id),
							)
						}
						onRestore={handleRestore}
						onDeletePermanently={handleDeletePermanently}
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
				<div className="hidden xl:block w-72 shrink-0">
					<TrashSidebar guideCount={total} />
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
