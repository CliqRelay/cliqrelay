import { useState } from "react";

import {
	Archive,
	Globe,
	MoreHorizontal,
	RotateCcw,
	Trash2,
} from "lucide-react";

import type { Guide } from "@repo/api-client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "./guide-confirm-action-dialog";
import { useGuideActions } from "./use-guide-actions";

type Props = {
	guide: Guide;
	variant?: "default" | "trash";
	onAction?: (action: string) => void;
};

export function GuideCardActions({
	guide,
	variant = "default",
	onAction,
}: Props) {
	const { confirmAction, setConfirmAction, loading, confirm } =
		useGuideActions(onAction);
	const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

	const status = guide.status;

	const actionLabel =
		confirmAction === "publish"
			? "Publish"
			: confirmAction === "archive"
				? "Archive"
				: confirmAction === "unarchive"
					? "Unarchive"
					: confirmAction === "restore"
						? "Restore"
						: confirmAction === "permanently-delete"
							? "Delete Forever"
							: "Delete";

	return (
		<>
			<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						className="size-8"
						onClick={(e) => e.stopPropagation()}
					>
						<MoreHorizontal className="h-4 w-4" />
						<span className="sr-only">Actions</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
					{variant === "trash" ? (
						<>
							<DropdownMenuItem onClick={() => setConfirmAction("restore")}>
								<RotateCcw className="h-4 w-4" />
								Restore
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => setConfirmAction("permanently-delete")}
							>
								<Trash2 className="h-4 w-4" />
								Delete Forever
							</DropdownMenuItem>
						</>
					) : (
						<>
							{status === "draft" && (
								<DropdownMenuItem onClick={() => setConfirmAction("publish")}>
									<Globe className="h-4 w-4" />
									Publish
								</DropdownMenuItem>
							)}
							{status === "draft" && (
								<DropdownMenuItem onClick={() => setConfirmAction("archive")}>
									<Archive className="h-4 w-4" />
									Archive
								</DropdownMenuItem>
							)}
							{status === "published" && (
								<DropdownMenuItem onClick={() => setConfirmAction("unpublish")}>
									<Archive className="h-4 w-4" />
									Unpublish
								</DropdownMenuItem>
							)}
							{status === "archived" && (
								<DropdownMenuItem onClick={() => setConfirmAction("unarchive")}>
									<RotateCcw className="h-4 w-4" />
									Unarchive
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => setConfirmAction("delete")}
							>
								<Trash2 className="h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<ConfirmActionDialog
				open={confirmAction !== null}
				title={`${actionLabel} Guide`}
				description={
					variant === "trash" && confirmAction === "restore"
						? `Are you sure you want to restore "${guide.title}"? It will be returned to draft status.`
						: variant === "trash" && confirmAction === "permanently-delete"
							? `Are you sure? This will permanently delete "${guide.title}". This action cannot be undone.`
							: confirmAction === "delete"
								? `Are you sure? This will delete "${guide.title}". You can restore it within 30 days whereby it will be permanently deleted.`
								: confirmAction === "publish"
									? `Are you sure you want to publish "${guide.title}"?`
									: confirmAction === "archive"
										? `Are you sure you want to archive "${guide.title}"? It can be unarchived later.`
										: `Are you sure you want to unarchive "${guide.title}"? It will be returned to draft status.`
				}
				confirmLabel={loading ? `${actionLabel}ing...` : actionLabel}
				variant={
					confirmAction === "delete" || confirmAction === "permanently-delete"
						? "destructive"
						: undefined
				}
				loading={loading}
				onConfirm={() => confirm(guide.id)}
				onCancel={() => setConfirmAction(null)}
			/>
		</>
	);
}
