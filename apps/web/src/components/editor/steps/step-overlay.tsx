import { type PointerEventHandler, type Ref } from "react";

import { INDICATOR_DEFAULTS } from "@repo/data-commons";

import { cn } from "@/lib/utils";

type Props = {
  left: string;
  top: string;
  interactive?: boolean;
  isDragging?: boolean;
  circleRef?: Ref<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: PointerEventHandler<HTMLDivElement>;
};

export function StepOverlay({
  left,
  top,
  interactive,
  isDragging,
  circleRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Props) {
  return (
    <div
      ref={circleRef}
      data-slot="step-indicator"
      className={cn(
        "absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full",
        interactive
          ? "cursor-grab touch-none will-change-transform active:cursor-grabbing"
          : "pointer-events-none",
        !isDragging && "transition-transform group-hover:scale-125",
      )}
      style={{
        left,
        top,
        width: INDICATOR_DEFAULTS.size,
        height: INDICATOR_DEFAULTS.size,
        borderWidth: INDICATOR_DEFAULTS.borderWidth,
        borderColor: INDICATOR_DEFAULTS.color,
        backgroundColor: `${INDICATOR_DEFAULTS.color}33`,
      }}
      onClick={interactive ? (event) => event.stopPropagation() : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}
