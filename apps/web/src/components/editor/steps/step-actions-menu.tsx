import type { ReactNode } from "react";

import { CopyIcon, ImageUpIcon, Trash2Icon } from "lucide-react";

import type { Step } from "@repo/api-client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  step: Step;
  trigger: ReactNode;
  isReplacing?: boolean;
  onReplaceMedia?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
};

export function StepActionsMenu({
  step,
  trigger,
  isReplacing,
  onReplaceMedia,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onReplaceMedia && (
          <DropdownMenuItem
            disabled={isReplacing}
            onClick={(e) => {
              e.stopPropagation();
              onReplaceMedia();
            }}
          >
            <ImageUpIcon className="h-3.5 w-3.5" />
            {step.mediaAssets?.length ? "Replace screenshot" : "Upload screenshot"}
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <CopyIcon className="h-3.5 w-3.5" />
            Duplicate
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2Icon className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
