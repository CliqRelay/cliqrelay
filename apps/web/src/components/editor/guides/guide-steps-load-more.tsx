import type { RefObject } from "react";

import { Spinner } from "@/components/ui/spinner";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";

type Props = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  rootRef?: RefObject<Element | null>;
  rootMargin?: string;
  disabled?: boolean;
};

export function GuideStepsLoadMore({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  rootRef,
  rootMargin,
  disabled = false,
}: Props) {
  const sentinelRef = useInfiniteScrollSentinel({
    enabled: hasNextPage && !isFetchingNextPage && !disabled,
    onIntersect: onLoadMore,
    rootRef,
    rootMargin,
  });

  if (!hasNextPage) {
    return null;
  }

  return (
    <div ref={sentinelRef} className="flex justify-center py-4" aria-live="polite">
      {isFetchingNextPage && <Spinner className="size-5 text-muted-foreground" />}
    </div>
  );
}
