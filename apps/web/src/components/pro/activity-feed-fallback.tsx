import type { LucideIcon } from "lucide-react";

import { Activity, GitCommit, UserPlus } from "lucide-react";

import { UpgradeToProButton } from "@/components/shared/upgrade-to-pro-button";

type Feature = {
  icon: LucideIcon;
  label: string;
};

type Props = {
  isUpgradeAvailable: boolean;
  onUpgrade?: () => Promise<void>;
};

const FEATURES: Feature[] = [
  {
    icon: GitCommit,
    label: "Live feed of guide edits, publishes, and deletions.",
  },
  {
    icon: UserPlus,
    label: "Member onboarding & team management history",
  },
];

export function ActivityFeedFallback({ isUpgradeAvailable, onUpgrade }: Props) {
  return (
    <div className="flex flex-col surface-card rounded-[20px] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h3 className="text-[14px] font-semibold text-foreground">Real-Time Team Activity</h3>
        </div>
      </div>
      <div className="p-5">
        <p className="mb-4 text-[12.5px] leading-relaxed text-muted-foreground">
          Track changes across your team in real time.
        </p>
        <ul className="space-y-2.5">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <li
                key={idx}
                className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground"
              >
                <Icon className="size-3.5 shrink-0 text-primary" />
                <span>{feature.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-auto [&>button]:w-full">
        <UpgradeToProButton
          isUpgradeAvailable={isUpgradeAvailable}
          onUpgrade={onUpgrade}
          className="w-full"
        />
      </div>
    </div>
  );
}
