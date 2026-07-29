import { Webhook, Zap } from "lucide-react";

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

export function WebhooksFallback({
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
						<Webhook size={16} className="text-muted-foreground" />
						Unlock Webhooks
					</DialogTitle>
					<DialogDescription>
						Automate your workflows by receiving real-time events when guides
						are published, updated, or archived. Upgrade to Pro to enable
						webhooks.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4 py-2">
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
								<Zap size={14} className="text-primary" />
							</div>
							<p className="text-sm font-medium">Pro Features</p>
						</div>
						<ul className="flex flex-col gap-2 text-sm text-muted-foreground">
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Automate workflows with real-time webhook events
							</li>
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Receive notifications on guide publish, update, and archive
							</li>
							<li className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary shrink-0" />
								Integrate with Slack, Discord, Zapier, and more
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
							<Webhook size={14} />
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
