import {
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
  type RefObject,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type { IndicatorPosition } from "@/models";

type IndicatorDragOptions = {
  position: IndicatorPosition;
  containerRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  onCommit: (position: IndicatorPosition) => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: IndicatorPosition;
  offsetX: number;
  offsetY: number;
  frame: number | null;
};

const clampNormalized = (value: number) => Math.min(1, Math.max(0, value));

export function useIndicatorDrag({
  position,
  containerRef,
  enabled = true,
  onCommit,
}: IndicatorDragOptions) {
  const circleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [localPosition, setLocalPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (dragRef.current) return;
    setLocalPosition((current) =>
      current.x === position.x && current.y === position.y
        ? current
        : { x: position.x, y: position.y },
    );
  }, [position.x, position.y]);

  useEffect(
    () => () => {
      const drag = dragRef.current;
      if (drag?.frame != null) cancelAnimationFrame(drag.frame);
    },
    [],
  );

  const paintOffset = () => {
    const drag = dragRef.current;
    if (!drag || !circleRef.current) return;
    drag.frame = null;
    circleRef.current.style.transform = `translate3d(${drag.offsetX}px, ${drag.offsetY}px, 0)`;
  };

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!enabled || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();

    const circle = circleRef.current;
    if (!circle) return;

    try {
      circle.setPointerCapture(event.pointerId);
    } catch {}

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: localPosition,
      offsetX: 0,
      offsetY: 0,
      frame: null,
    };
    setIsDragging(true);
  };

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.stopPropagation();
    drag.offsetX = event.clientX - drag.startX;
    drag.offsetY = event.clientY - drag.startY;

    if (drag.frame != null) return;
    drag.frame = requestAnimationFrame(paintOffset);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.stopPropagation();
    dragRef.current = null;
    if (drag.frame != null) cancelAnimationFrame(drag.frame);

    const circle = circleRef.current;
    if (circle) {
      if (circle.hasPointerCapture(event.pointerId)) {
        circle.releasePointerCapture(event.pointerId);
      }
      circle.style.transform = "";
    }
    setIsDragging(false);

    if (!commit) return;

    const offsetX = event.clientX - drag.startX;
    const offsetY = event.clientY - drag.startY;
    if (offsetX === 0 && offsetY === 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const next = {
      x: clampNormalized(drag.origin.x + offsetX / rect.width),
      y: clampNormalized(drag.origin.y + offsetY / rect.height),
    };

    setLocalPosition(next);
    startTransition(() => onCommit(next));
  };

  return {
    circleRef,
    position: localPosition,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => finishDrag(event, true),
    handlePointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => finishDrag(event, false),
  };
}
