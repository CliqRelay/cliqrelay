import { useState } from "react";

import type { GuideStatus, Visibility } from "@repo/api-client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PUBLIC_DRAFT_HINT } from "@/models";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibility: Visibility;
  status: GuideStatus;
  canSetPrivate: boolean;
  onSave: (visibility: Visibility) => void;
};

const OPTION_CLASS_NAME =
  "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5";

export function GuideVisibilityDialog({
  open,
  onOpenChange,
  visibility,
  status,
  canSetPrivate,
  onSave,
}: Props) {
  const [selectedVisibility, setSelectedVisibility] = useState<Visibility>(visibility);
  const [wasOpen, setWasOpen] = useState<boolean>(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelectedVisibility(visibility);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Visibility</DialogTitle>
          <DialogDescription>Choose who can see this guide.</DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={selectedVisibility}
          onValueChange={(v) => setSelectedVisibility(v as Visibility)}
          className="py-2"
        >
          <label
            className={`${OPTION_CLASS_NAME} ${!canSetPrivate ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <RadioGroupItem value="private" disabled={!canSetPrivate} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Private</span>
              <span className="text-xs text-muted-foreground">
                {canSetPrivate ? "Only you can see this guide" : "Only the creator can set this"}
              </span>
            </div>
          </label>
          <label className={OPTION_CLASS_NAME}>
            <RadioGroupItem value="team" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Team</span>
              <span className="text-xs text-muted-foreground">Visible to all team members</span>
            </div>
          </label>
          <label className={OPTION_CLASS_NAME}>
            <RadioGroupItem value="public" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Public</span>
              <span className="text-xs text-muted-foreground">
                Anyone with the link can view
                {status !== "published" && (
                  <span className="block font-medium text-warning">{PUBLIC_DRAFT_HINT}</span>
                )}
              </span>
            </div>
          </label>
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedVisibility === visibility}
            onClick={() => {
              onOpenChange(false);
              onSave(selectedVisibility);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
