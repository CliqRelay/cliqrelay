import { FileText, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";

import type { Guide } from "@repo/api-client";

import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

function getExpiryBadge(days: number) {
	if (days <= 3)
		return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 animate-pulse";
	if (days <= 7)
		return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
	if (days <= 15)
		return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
	return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400";
}

function daysUntilExpiry(deletedAt?: string | null): number {
	if (!deletedAt) return 30;
	const deleted = new Date(deletedAt).getTime();
	const expires = deleted + 30 * 24 * 60 * 60 * 1000;
	return Math.max(0, Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatDate(dateStr?: string | null): string {
	if (!dateStr) return "-";
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

interface TrashTableProps {
	guides: Guide[];
	selectedIds: string[];
	onToggleSelect: (id: string) => void;
	onToggleAll: () => void;
	onRestore: (guideId: string) => void;
	onDeletePermanently: (guideId: string) => void;
}

export function TrashTable({
	guides,
	selectedIds,
	onToggleSelect,
	onToggleAll,
	onRestore,
	onDeletePermanently,
}: TrashTableProps) {
	const allSelected = guides.length > 0 && selectedIds.length === guides.length;
	const someSelected =
		selectedIds.length > 0 && selectedIds.length < guides.length;

	return (
		<div className="rounded-[20px] overflow-hidden trash-table bg-surface-1 border border-border">
			<Table>
				<TableHeader>
					<TableRow className="border-b border-border hover:bg-transparent h-11">
						<TableHead className="w-12 pl-5">
							<Checkbox
								checked={
									allSelected ? true : someSelected ? "indeterminate" : false
								}
								onCheckedChange={onToggleAll}
								className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-(--trash-checkbox-border)"
							/>
						</TableHead>
						<TableHead className="w-16">
							<span className="sr-only">Preview</span>
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/60">
							Name
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/60">
							Type
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/60">
							Deleted On
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/60">
							Expires In
						</TableHead>
						<TableHead className="w-10" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{guides.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={7}
								className="text-center py-12 text-sm text-muted-foreground"
							>
								No items in trash.
							</TableCell>
						</TableRow>
					) : (
						guides.map((guide) => {
							const expiresIn = daysUntilExpiry(guide.deletedAt);
							const expiry = getExpiryBadge(expiresIn);
							return (
								<TableRow key={guide.id} className="group trash-row h-18.5">
									<TableCell className="pl-5">
										<Checkbox
											checked={selectedIds.includes(guide.id)}
											onCheckedChange={() => onToggleSelect(guide.id)}
											className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-(--trash-checkbox-border)"
										/>
									</TableCell>
									<TableCell>
										<div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-surface-2 to-surface-1 border border-border/60">
											<FileText
												className="size-4.5 text-muted-foreground/50"
												strokeWidth={1.7}
											/>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											<span className="text-[15px] font-semibold text-foreground leading-tight">
												{guide.title}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2 text-muted-foreground/60">
											<FileText className="size-3.75" strokeWidth={1.7} />
											<span className="text-[13px]">Guide</span>
										</div>
									</TableCell>
									<TableCell>
										<span className="text-[13px] text-muted-foreground/60 tabular-nums">
											{formatDate(guide.deletedAt)}
										</span>
									</TableCell>
									<TableCell>
										<span
											className={`inline-flex items-center rounded-full px-2.5 py-1.25 text-[11px] font-medium tabular-nums ${expiry}`}
										>
											{expiresIn} days
										</span>
									</TableCell>
									<TableCell className="pr-3">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button
													type="button"
													className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 opacity-0 transition-all duration-200 hover:bg-surface-hover hover:text-foreground group-hover:opacity-100"
												>
													<MoreHorizontal className="size-4" />
													<span className="sr-only">Actions</span>
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												align="end"
												className="w-48 bg-elevated border-border-strong shadow-(--trash-dropdown-shadow)"
											>
												<DropdownMenuItem
													className="text-[13px] gap-2.5 rounded-lg px-3 py-2 cursor-pointer"
													onClick={() => onRestore(guide.id)}
												>
													<RotateCcw className="size-3.5 text-muted-foreground" />
													Restore
												</DropdownMenuItem>
												<DropdownMenuSeparator className="my-1" />
												<DropdownMenuItem
													className="text-[13px] gap-2.5 rounded-lg px-3 py-2 text-destructive focus:text-destructive cursor-pointer"
													onClick={() => onDeletePermanently(guide.id)}
												>
													<Trash2 className="size-3.5" />
													Delete Permanently
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
	);
}
