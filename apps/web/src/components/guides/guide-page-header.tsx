import type { ReactNode } from "react";

import { FileText } from "lucide-react";

export function GuidePageHeader({ actions }: { actions?: ReactNode }) {
  return (
    <div className="relative mb-6 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <FileText className="size-6 text-primary" strokeWidth={1.8} />
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-foreground">
            Guides
          </h1>
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Browse and manage all your captured guides.
        </p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
