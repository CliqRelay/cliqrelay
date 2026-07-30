import { Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";

interface TrashPageHeaderProps {
	selectedCount: number;
	totalCount?: number;
	onRestore: () => void;
	onDeletePermanently: () => void;
	selectable?: boolean;
	onSelectAll?: () => void;
}

export function TrashPageHeader({
	selectedCount,
	totalCount = 0,
	onRestore,
	onDeletePermanently,
	selectable = false,
	onSelectAll,
}: TrashPageHeaderProps) {
	const allSelected = totalCount > 0 && selectedCount === totalCount;
	const someSelected = selectedCount > 0 && selectedCount < totalCount;

	return (
		<div className="relative mb-6 flex items-start justify-between">
			<div>
				<div className="flex items-center gap-3">
					<Trash2 className="size-6 text-primary" strokeWidth={1.8} />
					<h1 className="text-[28px] font-semibold tracking-tight text-foreground leading-tight">
						Trash
					</h1>
				</div>
				<p className="mt-1.5 text-[13px] text-muted-foreground">
					Guides and folders in trash will be permanently deleted after 30 days.
				</p>
			</div>

			<div className="flex items-center gap-3 pt-1">
				{selectable && onSelectAll && (
					<label className="flex items-center gap-2 cursor-pointer">
						<Checkbox
							checked={
								allSelected ? true : someSelected ? "indeterminate" : false
							}
							onCheckedChange={onSelectAll}
							className="size-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
						/>
						<span className="text-[13px] text-muted-foreground select-none">
							{allSelected ? `${selectedCount} selected` : "Select All"}
						</span>
					</label>
				)}

				{selectedCount > 0 && (
					<>
						<button
							type="button"
							onClick={onRestore}
							className="group relative flex h-10 items-center gap-2 rounded-[14px] px-5 text-[13.5px] font-semibold text-muted-foreground overflow-hidden transition-all duration-200 ease-out hover:text-foreground hover:-translate-y-px"
						>
							<span className="absolute inset-0 rounded-[14px] transition-all duration-200 ease-out bg-surface-1 border border-border" />
							<span className="absolute inset-0 rounded-[14px] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 bg-surface-2 border border-border-strong" />
							<span className="relative z-10">Restore ({selectedCount})</span>
						</button>

						<button
							type="button"
							className="group relative flex h-10 items-center gap-2 rounded-[14px] px-5 text-[13.5px] font-semibold text-white overflow-hidden transition-all duration-200 ease-out hover:-translate-y-px"
							onClick={onDeletePermanently}
						>
							<span className="absolute inset-0 rounded-[14px] transition-all duration-200 ease-out border" />
							<span className="absolute inset-0 rounded-[14px] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 border" />
							<span className="relative z-10">Delete Permanently</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
}
