import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ToolbarProps = {
  visible?: boolean;
  children: ReactNode;
};

export function StepMediaToolbar({ visible, children }: ToolbarProps) {
  return (
    <div
      className={cn(
        "absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border bg-background/90 p-1 shadow-sm backdrop-blur-sm transition-opacity",
        visible
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

type ToolbarButtonProps = {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

export function StepMediaToolbarButton({
  label,
  icon,
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          disabled={disabled}
          aria-label={label}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
