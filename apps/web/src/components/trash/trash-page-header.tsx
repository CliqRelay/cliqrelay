import { Trash2 } from "lucide-react";

import { AppUserRole } from "@repo/data-commons";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RoleGuard } from "../shared/role-guard";

type Props = {
	selectedCount: number;
	totalCount?: number;
	onRestore: () => void;
	onDeletePermanently: () => void;
	selectable?: boolean;
	onSelectAll?: () => void;
};

export function TrashPageHeader({
	selectedCount,
	totalCount = 0,
	onRestore,
	onDeletePermanently,
	selectable = false,
	onSelectAll,
}: Props) {
	const allSelected = totalCount > 0 && selectedCount === totalCount;
	const someSelected = selectedCount > 0 && selectedCount < totalCount;

	return (
		<div className="relative mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0">
				<div className="flex items-center gap-3">
					<Trash2 className="size-6 shrink-0 text-primary" strokeWidth={1.8} />
					<h1 className="text-[28px] font-semibold tracking-tight text-foreground leading-tight">
						Trash
					</h1>
				</div>
				<p className="mt-1.5 text-[13px] text-muted-foreground">
					Guides and folders in trash will be permanently deleted after 30 days.
				</p>
			</div>

			<div className="flex flex-col items-end gap-3">
				{selectable && onSelectAll && (
					<RoleGuard minRole={AppUserRole.EDITOR}>
						<Label className="cursor-pointer whitespace-nowrap">
							<Checkbox
								checked={
									allSelected ? true : someSelected ? "indeterminate" : false
								}
								onCheckedChange={onSelectAll}
							/>
							<span className="text-muted-foreground">
								{allSelected ? `${selectedCount} selected` : "Select All"}
							</span>
						</Label>
					</RoleGuard>
				)}

				{selectedCount > 0 && (
					<div className="flex items-center gap-3">
						<RoleGuard minRole={AppUserRole.EDITOR}>
							<Button
								variant="outline"
								size="lg"
								onClick={onRestore}
								className="font-semibold"
							>
								Restore ({selectedCount})
							</Button>
						</RoleGuard>
						<RoleGuard minRole={AppUserRole.ADMIN}>
							<Button
								variant="destructive"
								size="lg"
								onClick={onDeletePermanently}
								className="font-semibold"
							>
								Delete Permanently
							</Button>
						</RoleGuard>
					</div>
				)}
			</div>
		</div>
	);
}
