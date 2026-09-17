import { type RefObject, useEffect, useRef, useState } from "react";

import { animate, type AnimationPlaybackControls } from "framer-motion";

type Options = {
  enabled?: boolean;
  threshold?: number;
};

const INTENT_WINDOW_MS = 200;
const SCROLL_TRANSITION = { duration: 0.35, ease: "easeOut" } as const;

const animateToBottom = (
  viewport: HTMLDivElement,
  animationRef: RefObject<AnimationPlaybackControls | null>,
) => {
  animationRef.current?.stop();
  const from = viewport.scrollTop;
  const to = viewport.scrollHeight - viewport.clientHeight;
  if (to - from <= 1) {
    viewport.scrollTop = viewport.scrollHeight;
    return;
  }
  animationRef.current = animate(from, to, {
    ...SCROLL_TRANSITION,
    onUpdate: (value) => {
      viewport.scrollTop = value;
    },
    onComplete: () => {
      viewport.scrollTop = viewport.scrollHeight;
      animationRef.current = null;
    },
  });
};

// Keeps a scroll viewport pinned to its bottom edge as the content grows,
// releasing only when the user deliberately scrolls away.
//
// Do not use this in `mode="view"` of the step list: pinning to the bottom keeps
// the infinite-scroll sentinel inside its root margin, which loops through every page.
export function useStickToBottom({ enabled = true, threshold = 32 }: Options = {}): {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  isPinned: boolean;
  scrollToBottom: () => void;
} {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stuckRef = useRef(true);
  const animationRef = useRef<AnimationPlaybackControls | null>(null);
  const [isPinned, setIsPinned] = useState(true);

  const scrollToBottom = () => {
    stuckRef.current = true;
    setIsPinned(true);
    const viewport = viewportRef.current;
    if (viewport) {
      animateToBottom(viewport, animationRef);
    }
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!enabled || !viewport || !content || typeof ResizeObserver === "undefined") {
      return;
    }

    // Radix renders the scrollbar thumb as a sibling of the viewport, so gestures
    // must be observed on the root to catch thumb drags.
    const gestureRoot = viewport.closest('[data-slot="scroll-area"]') ?? viewport;

    let intentUntil = 0;
    let pointerHeld = false;

    const stopAnimation = () => {
      animationRef.current?.stop();
      animationRef.current = null;
    };

    const setStuck = (next: boolean) => {
      if (stuckRef.current === next) return;
      stuckRef.current = next;
      setIsPinned(next);
    };

    const armIntent = () => {
      intentUntil = Date.now() + INTENT_WINDOW_MS;
    };
    const holdPointer = () => {
      pointerHeld = true;
    };
    const releasePointer = () => {
      pointerHeld = false;
    };

    // Scroll events also fire for scroll anchoring and focus moves, which must not unstick.
    const handleScroll = () => {
      if (!pointerHeld && Date.now() >= intentUntil) return;
      stopAnimation();
      const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setStuck(distance <= threshold);
    };

    if (stuckRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
    }

    const observer = new ResizeObserver(() => {
      if (stuckRef.current) animateToBottom(viewport, animationRef);
    });
    observer.observe(content);
    observer.observe(viewport);

    gestureRoot.addEventListener("wheel", armIntent, { passive: true });
    gestureRoot.addEventListener("touchmove", armIntent, { passive: true });
    gestureRoot.addEventListener("keydown", armIntent);
    gestureRoot.addEventListener("pointerdown", holdPointer);
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    viewport.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      stopAnimation();
      observer.disconnect();
      gestureRoot.removeEventListener("wheel", armIntent);
      gestureRoot.removeEventListener("touchmove", armIntent);
      gestureRoot.removeEventListener("keydown", armIntent);
      gestureRoot.removeEventListener("pointerdown", holdPointer);
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [enabled, threshold]);

  return { viewportRef, contentRef, isPinned, scrollToBottom };
}
