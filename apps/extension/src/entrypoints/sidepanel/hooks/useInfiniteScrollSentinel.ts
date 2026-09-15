import { type RefObject, useEffect, useRef } from "react";

type Options = {
  enabled: boolean;
  onIntersect: () => void;
  rootRef?: RefObject<Element | null>;
  rootMargin?: string;
};

export function useInfiniteScrollSentinel({
  enabled,
  onIntersect,
  rootRef,
  rootMargin = "300px 0px",
}: Options) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!enabled || !target || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onIntersect();
        }
      },
      { root: rootRef?.current ?? null, rootMargin },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [enabled, onIntersect, rootRef, rootMargin]);

  return sentinelRef;
}
