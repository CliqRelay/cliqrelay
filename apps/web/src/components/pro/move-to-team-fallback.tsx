import { Lock, Shuffle } from "lucide-react";

import { UpgradeToProButton } from "@/components/shared/upgrade-to-pro-button";
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

export function MoveToTeamFallback({
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
            Unlock Team Collaboration
          </DialogTitle>
          <DialogDescription>
            Move guides between teams to better organize your workspace. Upgrade to Pro to use this
            feature.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                <Shuffle size={14} className="text-primary" />
              </div>
              <p className="text-sm font-medium">Pro Features</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                Move guides between teams seamlessly
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                Organize content across multiple team spaces
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                Collaborate with team-specific access controls
              </li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <UpgradeToProButton isUpgradeAvailable={isUpgradeAvailable} onUpgrade={onUpgrade} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
