import { Activity, Download, Lock, ShieldCheck, Users } from "lucide-react";

import { Button } from "../ui/button";
import { LearnAboutProButton } from "@/components/shared/learn-about-pro-button";

type Props = {
	isUpgradeAvailable: boolean;
	onUpgrade?: () => Promise<void>;
};

export function ActivityFeedFallback({ isUpgradeAvailable, onUpgrade }: Props) {
	return (
		<div className="surface-card rounded-[20px] p-5 flex flex-col">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Activity className="size-4 text-primary" />
					<h3 className="text-[14px] font-semibold text-foreground">
						Team Activity & Audit Trail
					</h3>
				</div>
			</div>
			<div className="p-5">
				<p className="text-[12.5px] text-muted-foreground leading-relaxed mb-4">
					Track changes across your team in real time.
				</p>
				<ul className="space-y-2.5">
					<li className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
						<Activity className="size-3.5 text-primary shrink-0" />
						<span>Live feed of guide edits, publishes, and deletions</span>
					</li>
					<li className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
						<Users className="size-3.5 text-primary shrink-0" />
						<span>Member onboarding & team management history</span>
					</li>
					<li className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
						<ShieldCheck className="size-3.5 text-primary shrink-0" />
						<span>Exportable audit logs for security & compliance</span>
					</li>
					<li className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
						<Download className="size-3.5 text-primary shrink-0" />
						<span>30-day activity retention</span>
					</li>
				</ul>
			</div>
			<div className="mt-auto [&>button]:w-full">
				{isUpgradeAvailable ? (
					<Button
						type="button"
						variant="default"
						className="w-full bg-[linear-gradient(140deg,oklch(0.58_0.19_258),oklch(0.42_0.18_262))] border border-[rgba(120,170,255,0.18)] shadow-(--shadow-primary)"
						onClick={() => onUpgrade?.()}
					>
						Upgrade to Pro
					</Button>
				) : (
					<LearnAboutProButton />
				)}
			</div>
		</div>
	);
}
