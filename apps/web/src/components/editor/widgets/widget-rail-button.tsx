import type { ComponentType, MouseEvent, Ref } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive?: boolean;
  controlsId?: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
};

export function WidgetRailButton({
  label,
  icon: Icon,
  isActive = false,
  controlsId,
  onClick,
  ref,
  className,
}: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          size="icon"
          aria-label={label}
          aria-expanded={isActive}
          aria-controls={controlsId}
          onClick={onClick}
          className={cn(
            "pointer-events-auto rounded-full border bg-muted/60 text-muted-foreground hover:bg-foreground/5! hover:text-foreground focus-visible:ring-2",
            isActive && "bg-secondary text-foreground ring-1 ring-ring/40",
            className,
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
