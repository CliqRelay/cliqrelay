import { useState } from "react";

import { ListOrderedIcon } from "lucide-react";

import { StepsReorderDialog } from "./steps-reorder-dialog";
import { Button } from "@/components/ui/button";
import type { EditorWidgetProps } from "@/models";

export function StepsReorderWidget(props: EditorWidgetProps) {
  const {
    steps,
    stepsLoading,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    onReorderSteps,
    onRevealStep,
  } = props;
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Drag steps into a new order without scrolling the guide.
      </p>

      <Button className="w-full" disabled={stepsLoading} onClick={() => setOpen(true)}>
        <ListOrderedIcon />
        Reorder steps
      </Button>

      <StepsReorderDialog
        open={open}
        onOpenChange={setOpen}
        steps={steps}
        stepsLoading={stepsLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
        onReorderSteps={onReorderSteps}
        onRevealStep={onRevealStep}
      />
    </div>
  );
}
