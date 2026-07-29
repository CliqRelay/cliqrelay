import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import {
	Archive,
	ArchiveRestore,
	Clock,
	Globe,
	Lock,
	MoreHorizontal,
	Send,
	Shuffle,
	Trash2,
	Undo2,
	Users,
} from "lucide-react";

import type { Guide, Visibility } from "@repo/api-client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeamStore } from "@/stores/team-store";
import { formatDuration, timeAgo } from "@/utils/time.utils";
import { GuideStatus } from "./guide-status";
import { MoveToTeamSlot } from "./move-to-team-slot";
import { StarButton } from "./star-button";

type Props = {
	guide: Guide;
	onDelete: (guideId: string) => void;
	onStarToggle: (guideId: string) => void;
	onArchive: (guideId: string) => void;
	onPublish?: (guideId: string) => void;
	onUnpublish?: (guideId: string) => void;
	onUnarchive?: (guideId: string) => void;
	onVisibilityChange?: (guideId: string, visibility: Visibility) => void;
	isUpgradeAvailable?: boolean;
	onUpgrade?: () => Promise<void>;
};

export function GuideCard({
	guide,
	onDelete,
	onStarToggle,
	onArchive,
	onPublish,
	onUnpublish,
	onUnarchive,
	onVisibilityChange,
	isUpgradeAvailable,
	onUpgrade,
}: Props) {
	const navigate = useNavigate();

	const teams = useTeamStore((s) => s.teams);
	const teamName = teams.find((t) => t.id === guide.teamId)?.name;

	const [moveToTeamOpen, setMoveToTeamOpen] = useState<boolean>(false);

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: card container needs div */}
			<div
				role="button"
				tabIndex={0}
				className="group relative flex flex-col rounded-2xl surface-card surface-card-hover transition-all duration-200 cursor-pointer mx-auto w-full max-w-sm"
				onClick={() =>
					navigate({
						to: "/dashboard/guides/$guideId",
						params: { guideId: guide.id },
					})
				}
			>
				<div className="flex flex-1 flex-col p-4 gap-3">
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-1.5 min-w-0">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground gap-1 hover:bg-surface-hover transition-colors duration-200"
									>
										{guide.visibility === "private" && (
											<>
												<Lock className="size-3" />
												Private
											</>
										)}
										{guide.visibility === "team" && (
											<>
												<Users className="size-3" />
												Team
											</>
										)}
										{guide.visibility === "public" && (
											<>
												<Globe className="size-3" />
												Public
											</>
										)}
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-36">
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											onVisibilityChange?.(guide.id, "private");
										}}
									>
										<Lock className="mr-2 size-3.5" />
										Private
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											onVisibilityChange?.(guide.id, "team");
										}}
									>
										<Users className="mr-2 size-3.5" />
										Team
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											onVisibilityChange?.(guide.id, "public");
										}}
									>
										<Globe className="mr-2 size-3.5" />
										Public
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							{teamName && (
								<span className="inline-flex items-center rounded-md bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary truncate max-w-35">
									{teamName}
								</span>
							)}
						</div>
						<StarButton
							isStarred={guide.isStarred}
							onToggle={() => onStarToggle(guide.id)}
						/>
					</div>

					<div className="space-y-1">
						<h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2">
							{guide.title}
						</h3>
						{guide.description && (
							<p className="text-[13px] text-muted-foreground/70 leading-relaxed line-clamp-2">
								{guide.description}
							</p>
						)}
					</div>

					<div className="mt-auto flex items-center gap-2 pt-1">
						<GuideStatus status={guide.status} />
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
							<Clock className="size-3" />
							<span>{formatDuration(guide.durationSeconds)}</span>
						</div>
						<span className="text-[11px] text-muted-foreground/40 mx-0.5">
							·
						</span>
						<span className="text-[11px] text-muted-foreground/50">
							{timeAgo(guide.updatedAt)}
						</span>
						<div className="ml-auto">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="flex size-7 items-center justify-center rounded-lg text-muted-foreground/30 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-surface-hover hover:text-foreground focus-visible:opacity-100"
									>
										<MoreHorizontal className="size-4" />
										<span className="sr-only">Actions</span>
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									{guide.status === "draft" && onPublish && (
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												e.preventDefault();
												onPublish(guide.id);
											}}
										>
											<Send className="mr-2 size-3.5" />
											Publish
										</DropdownMenuItem>
									)}
									{guide.status === "published" && onUnpublish && (
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												e.preventDefault();
												onUnpublish(guide.id);
											}}
										>
											<Undo2 className="mr-2 size-3.5" />
											Unpublish
										</DropdownMenuItem>
									)}
									{(guide.status === "draft" ||
										guide.status === "published") && (
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												e.preventDefault();
												onArchive(guide.id);
											}}
										>
											<Archive className="mr-2 size-3.5" />
											Archive
										</DropdownMenuItem>
									)}
									{guide.status === "archived" && onUnarchive && (
										<DropdownMenuItem
											onClick={(e) => {
												e.stopPropagation();
												e.preventDefault();
												onUnarchive(guide.id);
											}}
										>
											<ArchiveRestore className="mr-2 size-3.5" />
											Unarchive
										</DropdownMenuItem>
									)}
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
											setMoveToTeamOpen(true);
										}}
									>
										<Shuffle className="mr-2 size-3.5" />
										Move to Team
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
											onDelete(guide.id);
										}}
									>
										<Trash2 className="mr-2 size-3.5" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
			</div>
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
