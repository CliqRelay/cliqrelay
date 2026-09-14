import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

export function ComingSoon({
  title = "Coming Soon",
  description = "This feature is currently being worked on.",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3",
        className,
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Sparkles className="size-4 text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="text-[12.5px] font-semibold text-foreground">{title}</span>
        <span className="text-[11.5px] leading-relaxed text-muted-foreground">{description}</span>
      </div>
    </div>
  );
}
