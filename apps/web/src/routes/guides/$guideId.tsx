import { createFileRoute, Link } from "@tanstack/react-router";

import { api } from "@repo/api-client";

import { GuideHeader } from "@/components/editor/guides/guide-header";
import { GuideTimelineSkeleton } from "@/components/editor/guides/guide-timeline-skeleton";
import { GuideWorkflowViewMode } from "@/components/editor/guides/guide-workflow-view-mode";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStepEditor } from "@/hooks/useStepEditor";

export const Route = createFileRoute("/guides/$guideId")({
  component: PublicGuidePage,
});

function PublicGuidePage() {
  const { guideId } = Route.useParams();

  const guideQuery = api.guides.useGetGuideById(guideId, {
    query: { retry: false },
    request: { credentials: "include" },
  });
  const guide = guideQuery.data?.guide ?? null;

  const { steps, totalSteps, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useStepEditor(guideId);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-2">
        <Link to="/">
          <Logo className="h-8" />
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth/sign-in">Sign in</Link>
        </Button>
      </header>

      <main className="p-6">
        {guideQuery.isPending ? (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-full" />
            <GuideTimelineSkeleton />
          </div>
        ) : guide ? (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            <GuideHeader guide={guide} isEditMode={false} stepCount={totalSteps} />
            <div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />
            <GuideWorkflowViewMode
              steps={steps}
              stepsLoading={isLoading}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
            />
          </div>
        ) : (
          <GuideUnavailable />
        )}
      </main>
    </div>
  );
}

function GuideUnavailable() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold">Guide unavailable</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          This guide doesn't exist or isn't publicly available. Sign in if it was shared with your
          team.
        </p>
        <Button asChild>
          <Link to="/auth/sign-in">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
