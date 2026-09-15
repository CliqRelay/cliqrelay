import { Spinner } from "@/components/ui/spinner";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";

type Props = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

export function GuideStepsLoadMore({ hasNextPage, isFetchingNextPage, onLoadMore }: Props) {
  const sentinelRef = useInfiniteScrollSentinel({
    enabled: hasNextPage && !isFetchingNextPage,
    onIntersect: onLoadMore,
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
