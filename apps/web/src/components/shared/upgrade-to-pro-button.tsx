import { useState } from "react";
import type { ComponentProps } from "react";

import { LearnAboutProButton } from "@/components/shared/learn-about-pro-button";
import { Button } from "@/components/ui/button";

type Props = {
  isUpgradeAvailable: boolean;
  onUpgrade?: () => Promise<void>;
  label?: string;
  pendingLabel?: string;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

export function UpgradeToProButton({
  isUpgradeAvailable,
  onUpgrade,
  label = "Upgrade to Pro",
  pendingLabel = "Upgrading...",
  disabled = false,
  variant = "default",
  size = "default",
  className,
}: Props) {
  const [isPending, setIsPending] = useState<boolean>(false);

  const handleUpgrade = async (): Promise<void> => {
    if (!onUpgrade) return;

    setIsPending(true);
    try {
      await onUpgrade();
    } finally {
      setIsPending(false);
    }
  };

  if (!isUpgradeAvailable) {
    return <LearnAboutProButton />;
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isPending}
      onClick={handleUpgrade}
    >
      {isPending ? pendingLabel : label}
    </Button>
  );
}
