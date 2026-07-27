import { Link } from "@tanstack/react-router";
import { Lock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { envClient } from "@/constants/env-client";

type Props = {
	isUpgradeAvailable: boolean;
	onUpgrade?: () => Promise<void>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateTeamFallback({
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
						Unlock Team Management
					</DialogTitle>
					<DialogDescription>
						Teams let you organize your workspace into separate areas for
						collaboration. Upgrade to Pro to create and manage teams.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
								<Users size={14} className="text-primary" />
							</div>
							<p className="text-sm font-medium">Pro Features</p>
						</div>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Create multiple teams within your organization
							</li>
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Assign members to specific teams with granular access
							</li>
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Keep guides and content scoped per team
							</li>
						</ul>
					</div>
				</div>
				<DialogFooter>
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
						<Button
							type="button"
							variant="default"
							className="gap-2"
							onClick={() => window.open(envClient.siteUrl)}
						>
							Learn About {envClient.appName} Pro
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
