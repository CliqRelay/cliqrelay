import { useReducedMotion } from "motion/react";

import { getStepAnchorId } from "@/models";

export function useRevealStep(selectStep: (stepId: string) => void) {
  const prefersReducedMotion = useReducedMotion();

  return (stepId: string) => {
    selectStep(stepId);

    const element = document.getElementById(getStepAnchorId(stepId));
    if (!element) {
      return;
    }

    element.focus({ preventScroll: true });
    element.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
  };
}
