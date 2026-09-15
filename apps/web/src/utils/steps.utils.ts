import type { InfiniteData } from "@tanstack/react-query";

import type { GetAllStepsResponse } from "@repo/api-client";

export type StepsInfiniteData = InfiniteData<GetAllStepsResponse, string | undefined>;

export function reorderStepsInPages(
  data: StepsInfiniteData,
  targetStepId: string,
  prevStepId?: string | null,
  nextStepId?: string | null,
): StepsInfiniteData {
  const flat = data.pages.flatMap((page) => page.steps);
  const targetIndex = flat.findIndex((step) => step.id === targetStepId);
  if (targetIndex === -1) {
    return data;
  }
  const [target] = flat.splice(targetIndex, 1);

  const prevIndex = prevStepId ? flat.findIndex((step) => step.id === prevStepId) : -1;
  const nextIndex = nextStepId ? flat.findIndex((step) => step.id === nextStepId) : -1;

  let insertIndex = flat.length;
  if (prevIndex !== -1) {
    insertIndex = prevIndex + 1;
  } else if (nextIndex !== -1) {
    insertIndex = nextIndex;
  }
  flat.splice(insertIndex, 0, target);

  let offset = 0;
  const pages = data.pages.map((page) => {
    const steps = flat.slice(offset, offset + page.steps.length);
    offset += page.steps.length;
    return { ...page, steps };
  });

  return { ...data, pages };
}
