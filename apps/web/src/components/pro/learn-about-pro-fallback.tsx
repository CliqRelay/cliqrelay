import { Sparkles } from "lucide-react";

import { UpgradeToProButton } from "@/components/shared/upgrade-to-pro-button";
import { envClient } from "@/constants/env-client";

type Props = {
  isUpgradeAvailable: boolean;
  onUpgrade?: () => Promise<void>;
};

export function LearnAboutProFallback({ isUpgradeAvailable = false, onUpgrade }: Props) {
  return (
    <div className="rounded-xl border border-primary/8 bg-linear-to-b from-primary/5 to-transparent p-3.5">
      <div className="mb-1 flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-[12px] font-semibold text-foreground">{envClient.appName} Pro</span>
      </div>
      <p className="mb-2 text-[11.5px] leading-relaxed text-muted-foreground">
        Unlimited guides, custom branding and advanced analytics.
      </p>
      <div className="[&>button]:w-full">
        <UpgradeToProButton
          isUpgradeAvailable={isUpgradeAvailable}
          onUpgrade={onUpgrade}
          size="sm"
          className="mt-2.5 w-full"
        />
      </div>
    </div>
  );
}
