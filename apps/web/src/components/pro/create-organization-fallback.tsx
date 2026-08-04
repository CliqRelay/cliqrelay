import { Building2, Lock } from "lucide-react";

import { LearnAboutProButton } from "@/components/shared/learn-about-pro-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type Props = {
	isUpgradeAvailable: boolean;
	onUpgrade?: () => Promise<void>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateOrganizationFallback({
	isUpgradeAvailable = false,
	onUpgrade,
	open,
	onOpenChange,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Lock size={16} className="text-muted-foreground" />
						Unlock Multiple Organizations
					</DialogTitle>
					<DialogDescription>
						Organizations let you separate clients, projects, or workspaces.
						Upgrade to Pro to create and manage multiple organizations.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
								<Building2 size={14} className="text-primary" />
							</div>
							<p className="text-sm font-medium">Pro Features</p>
						</div>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Create multiple organizations under one account
							</li>
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Keep guides and content scoped per organization
							</li>
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Invite members to collaborate per organization
							</li>
						</ul>
					</div>
				</div>
				<DialogFooter className="flex flex-row justify-between items-center">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					{isUpgradeAvailable ? (
						<Button
							type="button"
							className="gap-2"
							onClick={() => onUpgrade?.()}
						>
							<Lock size={14} />
							Upgrade to Pro
						</Button>
					) : (
						<LearnAboutProButton />
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
