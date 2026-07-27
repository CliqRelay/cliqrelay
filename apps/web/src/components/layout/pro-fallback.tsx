import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { envClient } from "@/constants/env-client";
import { LearnAboutProButton } from "@/components/shared/learn-about-pro-button";

type Props = {
	isUpgradeAvailable: boolean;
	onUpgrade?: () => Promise<void>;
};

export function ProFallback({ isUpgradeAvailable = false, onUpgrade }: Props) {
	return (
		<div className="rounded-xl p-3.5 bg-linear-to-b from-primary/5 to-transparent border border-primary/8">
			<div className="flex items-center gap-1.5 mb-1">
				<Sparkles className="size-3.5 text-primary" />
				<span className="text-[12px] font-semibold text-foreground">
					{envClient.appName} Pro
				</span>
			</div>
			<p className="mb-2 text-[11.5px] text-muted-foreground leading-relaxed">
				Unlimited guides, custom branding and advanced analytics.
			</p>
			<div className="[&>button]:w-full">
				{isUpgradeAvailable ? (
					<Button
						type="button"
						variant="default"
						size="sm"
						className="mt-2.5 w-full"
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
