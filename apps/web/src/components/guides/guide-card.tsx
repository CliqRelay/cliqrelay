import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import {
	Archive,
	ArchiveRestore,
	Clock,
	Eye,
	Globe,
	Lock,
	MoreHorizontal,
	RotateCcw,
	Send,
	Shuffle,
	Trash2,
	Undo2,
	UserRound,
	Users,
} from "lucide-react";

import type { Guide, Visibility } from "@repo/api-client";
import { AppUserRole, hasMinimumRole } from "@repo/data-commons";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useOrgStore, useTeamStore, useUserStore } from "@/stores";
import { formatDuration, timeAgo } from "@/utils/time.utils";
import { RoleGuard } from "../shared/role-guard";
import { GuideStatusBadge } from "./guide-status-badge";
import { MoveToTeamSlot } from "./move-to-team-slot";
import { StarButton } from "./star-button";

type Props = {
	guide: Guide;
	onDelete?: (guideId: string) => void;
	onStarToggle?: (guideId: string) => void;
	onArchive?: (guideId: string) => void;
	onPublish?: (guideId: string) => void;
	onUnpublish?: (guideId: string) => void;
	onUnarchive?: (guideId: string) => void;
	onVisibilityChange?: (guideId: string, visibility: Visibility) => void;
	isUpgradeAvailable?: boolean;
	onUpgrade?: () => Promise<void>;
	selectable?: boolean;
	selected?: boolean;
	onToggleSelect?: (guideId: string) => void;
	onRestore?: (guideId: string) => void;
	onDeletePermanently?: (guideId: string) => void;
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
	selectable = false,
	selected = false,
	onToggleSelect,
	onRestore,
	onDeletePermanently,
}: Props) {
	const navigate = useNavigate();

	const teams = useTeamStore((s) => s.teams);
	const teamName = teams.find((t) => t.id === guide.teamId)?.name;
	const userId = useUserStore((s) => s.userId);
	const isCreator = guide.creatorId !== null && userId === guide.creatorId;
	const role = useOrgStore((s) => s.currentMember?.role);
	const isEditor = hasMinimumRole(role as AppUserRole, AppUserRole.EDITOR);
	const isAdmin = hasMinimumRole(role as AppUserRole, AppUserRole.ADMIN);

	const [moveToTeamOpen, setMoveToTeamOpen] = useState<boolean>(false);
	const [visibilityDialogOpen, setVisibilityDialogOpen] =
		useState<boolean>(false);
	const [selectedVisibility, setSelectedVisibility] = useState<Visibility>(
		guide.visibility,
	);

	return (
		<>
			<Card
				role="button"
				tabIndex={0}
				className={cn(
					"group cursor-pointer mx-auto w-full max-w-sm h-full surface-card surface-card-hover transition-all duration-200 rounded-2xl py-0 gap-2 overflow-hidden",
					selectable && selected && "ring-2 ring-primary",
				)}
				onClick={() => {
					if (selectable && guide.status === "deleted") return;
					navigate({
						to: "/dashboard/guides/$guideId",
						params: { guideId: guide.id },
					});
				}}
			>
				<CardHeader className="px-3 pt-3 pb-0 gap-1.5">
					<div className="flex items-center gap-1.5 min-w-0 flex-wrap">
						{selectable && (
							<RoleGuard minRole={AppUserRole.EDITOR}>
								<Checkbox
									checked={selected}
									onCheckedChange={() => onToggleSelect?.(guide.id)}
									className="size-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
									onClick={(e) => e.stopPropagation()}
								/>
							</RoleGuard>
						)}
						{guide.visibility === "private" && (
							<span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground gap-1">
								<Lock className="size-3" />
								Private
							</span>
						)}
						{guide.visibility === "team" && (
							<span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground gap-1">
								<Users className="size-3" />
								Team
							</span>
						)}
						{guide.visibility === "public" && (
							<span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground gap-1">
								<Globe className="size-3" />
								Public
							</span>
						)}
						{teamName && (
							<span className="inline-flex items-center rounded-md bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary truncate max-w-35">
								{teamName}
							</span>
						)}
					</div>
					{onStarToggle && (
						<CardAction>
							<StarButton
								isStarred={guide.isStarred}
								onToggle={() => onStarToggle(guide.id)}
							/>
						</CardAction>
					)}
				</CardHeader>
				<CardContent className="px-5 flex flex-col gap-1 flex-1 min-h-0">
					<div className="space-y-1">
						<CardTitle className="text-[15px] leading-snug line-clamp-2 font-semibold">
							{guide.title}
						</CardTitle>
						{guide.description && (
							<CardDescription className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
								{guide.description}
							</CardDescription>
						)}
					</div>
					{guide.creator?.name && (
						<div className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground/50 pt-2">
							<UserRound className="size-3 text-muted-foreground/70" />
							<span className="text-muted-foreground/70">
								{guide.creator.name}
							</span>
						</div>
					)}
				</CardContent>
				<CardFooter className="px-5 pb-3 pt-0 gap-1.5">
					<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
						<Clock className="size-3 text-muted-foreground/70" />
						<span className="text-muted-foreground/70">
							{formatDuration(guide.durationSeconds)}
						</span>
					</div>
					<span className="text-[11px] text-muted-foreground/40">|</span>
					<span className="text-[11px] text-muted-foreground/70">
						{timeAgo(guide.updatedAt)}
					</span>
					<span className="text-[11px] text-muted-foreground/40">|</span>
					<GuideStatusBadge status={guide.status} />
					{isCreator || isEditor ? (
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
									{guide.status === "deleted" &&
									(onRestore || onDeletePermanently) ? (
										<>
											{onRestore && (
												<RoleGuard minRole={AppUserRole.EDITOR}>
													<DropdownMenuItem
														className="text-[13px] gap-2.5 rounded-lg px-3 py-2 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															onRestore(guide.id);
														}}
													>
														<RotateCcw className="size-3.5 text-muted-foreground" />
														Restore
													</DropdownMenuItem>
												</RoleGuard>
											)}
											{onDeletePermanently && (isCreator || isAdmin) && (
												<>
													<DropdownMenuSeparator className="my-1" />
													<DropdownMenuItem
														className="text-[13px] gap-2.5 rounded-lg px-3 py-2 text-destructive focus:text-destructive cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															onDeletePermanently(guide.id);
														}}
													>
														<Trash2 className="size-3.5 text-destructive" />
														Delete Permanently
													</DropdownMenuItem>
												</>
											)}
										</>
									) : (
										<>
											<RoleGuard minRole={AppUserRole.EDITOR}>
												{guide.status === "draft" && onPublish && (
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
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
															onArchive?.(guide.id);
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
														setSelectedVisibility(guide.visibility);
														setVisibilityDialogOpen(true);
													}}
												>
													<Eye className="mr-2 size-3.5" />
													Change Visibility
												</DropdownMenuItem>
											</RoleGuard>
											<RoleGuard minRole={AppUserRole.ADMIN}>
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														setMoveToTeamOpen(true);
													}}
												>
													<Shuffle className="mr-2 size-3.5" />
													Move to Team
												</DropdownMenuItem>
											</RoleGuard>
											{(isCreator || isAdmin) && (
												<>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className="text-destructive focus:text-destructive"
														onClick={(e) => {
															e.stopPropagation();
															onDelete?.(guide.id);
														}}
													>
														<Trash2 className="mr-2 size-3.5 text-destructive" />
														Delete
													</DropdownMenuItem>
												</>
											)}
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					) : null}
				</CardFooter>
			</Card>
			<MoveToTeamSlot
				guideId={guide.id}
				isUpgradeAvailable={isUpgradeAvailable ?? false}
				onUpgrade={onUpgrade}
				open={moveToTeamOpen}
				onOpenChange={setMoveToTeamOpen}
			/>
			<Dialog
				open={visibilityDialogOpen}
				onOpenChange={setVisibilityDialogOpen}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Change Visibility</DialogTitle>
						<DialogDescription>
							Choose who can see this guide.
						</DialogDescription>
					</DialogHeader>
					<RadioGroup
						value={selectedVisibility}
						onValueChange={(v) => setSelectedVisibility(v as Visibility)}
						className="py-2"
					>
						<label
							className={`flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 ${!isCreator ? "cursor-not-allowed opacity-50" : ""}`}
						>
							<RadioGroupItem value="private" disabled={!isCreator} />
							<div className="flex flex-col gap-0.5">
								<span className="text-sm font-medium">Private</span>
								<span className="text-xs text-muted-foreground">
									{isCreator
										? "Only you can see this guide"
										: "Only the creator can set this"}
								</span>
							</div>
						</label>
						<label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
							<RadioGroupItem value="team" />
							<div className="flex flex-col gap-0.5">
								<span className="text-sm font-medium">Team</span>
								<span className="text-xs text-muted-foreground">
									Visible to all team members
								</span>
							</div>
						</label>
						<label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
							<RadioGroupItem value="public" />
							<div className="flex flex-col gap-0.5">
								<span className="text-sm font-medium">Public</span>
								<span className="text-xs text-muted-foreground">
									Anyone with the link can view
								</span>
							</div>
						</label>
					</RadioGroup>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setVisibilityDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							disabled={selectedVisibility === guide.visibility}
							onClick={() => {
								setVisibilityDialogOpen(false);
								onVisibilityChange?.(guide.id, selectedVisibility);
							}}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
