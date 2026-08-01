import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
	Archive,
	ArchiveRestore,
	Download,
	MoreHorizontal,
	Send,
	Shuffle,
	Trash2,
	Undo2,
} from "lucide-react";

import { api, type Guide } from "@repo/api-client";
import { AppUserRole, hasMinimumRole } from "@repo/data-commons";

import { ExportDialog } from "@/components/editor/shared/export-dialog";
import { ConfirmActionDialog } from "@/components/guides/guide-confirm-action-dialog";
import { MoveToTeamSlot } from "@/components/guides/move-to-team-slot";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";
import {
	archiveGuide,
	deleteGuide,
	publishGuide,
	unarchiveGuide,
	unpublishGuide,
} from "@/server-fns/guides";
import { useOrgStore, useUserStore } from "@/stores";
import { RoleGuard } from "../shared/role-guard";

type Props = {
	guide: Pick<Guide, "id" | "title" | "status" | "creatorId">;
	isUpgradeAvailable?: boolean;
	onUpgrade?: () => Promise<void>;
};

export function GuideActionsDropdown({
	guide,
	isUpgradeAvailable,
	onUpgrade,
}: Props) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const userId = useUserStore((s) => s.userId);
	const isCreator = guide.creatorId !== null && userId === guide.creatorId;
	const role = useOrgStore((s) => s.currentMember?.role);
	const isAdmin = hasMinimumRole(role as AppUserRole, AppUserRole.ADMIN);

	const [publishDialogOpen, setPublishDialogOpen] = useState<boolean>(false);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState<boolean>(false);
	const [unarchiveDialogOpen, setUnarchiveDialogOpen] =
		useState<boolean>(false);
	const [unpublishDialogOpen, setUnpublishDialogOpen] =
		useState<boolean>(false);
	const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
	const [moveToTeamOpen, setMoveToTeamOpen] = useState<boolean>(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

	const handlePublish = async () => {
		try {
			await publishGuide({ data: { guideId: guide.id } });
			setPublishDialogOpen(false);
			toast("Published", { description: "Guide published successfully" });
			router.invalidate();
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetAllGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetStarredGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetGuideByIdQueryKey(guide.id),
			});
		} catch (error) {
			toast.error("Error", {
				description:
					error instanceof Error ? error.message : "Failed to publish",
			});
		}
	};

	const handleUnpublish = async () => {
		try {
			await unpublishGuide({ data: { guideId: guide.id } });
			setUnpublishDialogOpen(false);
			toast("Unpublished", { description: "Guide returned to draft" });
			router.invalidate();
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetAllGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetStarredGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetGuideByIdQueryKey(guide.id),
			});
		} catch (error) {
			toast.error("Error", {
				description:
					error instanceof Error ? error.message : "Failed to unpublish",
			});
		}
	};

	const handleArchive = async () => {
		try {
			await archiveGuide({ data: { guideId: guide.id } });
			setArchiveDialogOpen(false);
			toast("Archived", { description: "Guide archived" });
			router.invalidate();
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetAllGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetStarredGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetGuideByIdQueryKey(guide.id),
			});
		} catch (error) {
			toast.error("Error", {
				description:
					error instanceof Error ? error.message : "Failed to archive",
			});
		}
	};

	const handleUnarchive = async () => {
		try {
			await unarchiveGuide({ data: { guideId: guide.id } });
			setUnarchiveDialogOpen(false);
			toast("Unarchived", { description: "Guide returned to draft" });
			router.invalidate();
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetAllGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetStarredGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetGuideByIdQueryKey(guide.id),
			});
		} catch (error) {
			toast.error("Error", {
				description:
					error instanceof Error ? error.message : "Failed to unarchive",
			});
		}
	};

	const handleDelete = async () => {
		try {
			await deleteGuide({ data: { guideId: guide.id } });
			setDeleteDialogOpen(false);
			toast("Deleted", { description: "Guide moved to trash" });
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetAllGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetStarredGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetGuidesCountQueryKey(),
			});
			router.navigate({ to: "/dashboard/guides" });
		} catch (error) {
			toast.error("Error", {
				description:
					error instanceof Error ? error.message : "Failed to delete",
			});
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="sm" variant="ghost">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{guide.status === "draft" && (
						<>
							<DropdownMenuItem onSelect={() => setPublishDialogOpen(true)}>
								<Send className="mr-2 h-4 w-4" />
								Publish
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setArchiveDialogOpen(true)}>
								<Archive className="mr-2 h-4 w-4" />
								Archive
							</DropdownMenuItem>
						</>
					)}
					{guide.status === "published" && (
						<>
							<DropdownMenuItem onSelect={() => setUnpublishDialogOpen(true)}>
								<Undo2 className="mr-2 h-4 w-4" />
								Unpublish
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setArchiveDialogOpen(true)}>
								<Archive className="mr-2 h-4 w-4" />
								Archive
							</DropdownMenuItem>
						</>
					)}
					{guide.status === "archived" && (
						<DropdownMenuItem onSelect={() => setUnarchiveDialogOpen(true)}>
							<ArchiveRestore className="mr-2 h-4 w-4" />
							Unarchive
						</DropdownMenuItem>
					)}
					<RoleGuard minRole={AppUserRole.ADMIN}>
						<DropdownMenuItem onSelect={() => setMoveToTeamOpen(true)}>
							<Shuffle className="mr-2 h-4 w-4" />
							Move to Team
						</DropdownMenuItem>
					</RoleGuard>
					<DropdownMenuItem onSelect={() => setExportDialogOpen(true)}>
						<Download className="mr-2 h-4 w-4" />
						Export
					</DropdownMenuItem>
					{(isCreator || isAdmin) && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={() => setDeleteDialogOpen(true)}
							>
								<Trash2 className="mr-2 h-4 w-4 text-destructive" />
								Delete
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<ConfirmActionDialog
				open={publishDialogOpen}
				title="Publish Guide"
				description="Are you sure you want to publish this guide? It will be visible to your team."
				confirmLabel="Publish"
				loading={false}
				onConfirm={handlePublish}
				onCancel={() => setPublishDialogOpen(false)}
			/>

			<ConfirmActionDialog
				open={archiveDialogOpen}
				title="Archive Guide"
				description="Are you sure you want to archive this guide? You can unarchive it later."
				confirmLabel="Archive"
				loading={false}
				onConfirm={handleArchive}
				onCancel={() => setArchiveDialogOpen(false)}
			/>

			<ConfirmActionDialog
				open={unarchiveDialogOpen}
				title="Unarchive Guide"
				description="Are you sure you want to unarchive this guide? It will be restored to draft status."
				confirmLabel="Unarchive"
				loading={false}
				onConfirm={handleUnarchive}
				onCancel={() => setUnarchiveDialogOpen(false)}
			/>

			<ConfirmActionDialog
				open={unpublishDialogOpen}
				title="Unpublish Guide"
				description="Are you sure you want to unpublish this guide? It will be returned to draft and no longer visible to others."
				confirmLabel="Unpublish"
				loading={false}
				onConfirm={handleUnpublish}
				onCancel={() => setUnpublishDialogOpen(false)}
			/>

			<ConfirmActionDialog
				open={deleteDialogOpen}
				title="Delete Guide"
				description="Are you sure you want to delete this guide? You can restore it from trash within 30 days."
				confirmLabel="Delete"
				variant="destructive"
				loading={false}
				onConfirm={handleDelete}
				onCancel={() => setDeleteDialogOpen(false)}
			/>

			<ExportDialog
				guideId={guide.id}
				guideTitle={guide.title}
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
			/>

			<MoveToTeamSlot
				guideId={guide.id}
				isUpgradeAvailable={isUpgradeAvailable ?? false}
				onUpgrade={onUpgrade}
				open={moveToTeamOpen}
				onOpenChange={setMoveToTeamOpen}
			/>
		</>
	);
}
