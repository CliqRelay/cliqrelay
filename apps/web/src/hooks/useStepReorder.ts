import { useState } from "react";

import {
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import type { Step } from "@repo/api-client";

import { getReorderNeighbours } from "@/models";

type Options = {
  steps: Step[];
  onReorder?: (targetStepId: string, prevStepId: string | null, nextStepId: string | null) => void;
};

export function useStepReorder({ steps, onReorder }: Options) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const neighbours = getReorderNeighbours(
      steps,
      event.active.id as string,
      event.over?.id as string | undefined,
    );
    if (!neighbours) {
      return;
    }

    onReorder?.(neighbours.targetStepId, neighbours.prevStepId, neighbours.nextStepId);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return { activeId, sensors, handleDragStart, handleDragEnd, handleDragCancel };
}
