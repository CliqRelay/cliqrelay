import { useNavigate } from "@tanstack/react-router";

import { FileText } from "lucide-react";

import { api } from "@repo/api-client";

import { Button } from "../ui/button";
import { GuideCard } from "@/components/guides/guide-card";
import { useToggleStar } from "@/components/guides/use-toggle-star";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function RecentGuides({ teamId }: { teamId?: string }) {
  const navigate = useNavigate();
  const { toggleStar } = useToggleStar();

  const guidesQuery = api.guides.useGetAllGuides(
    {
      team_id: teamId,
      limit: 4,
      page: 1,
      sort_by: "updated_at",
      sort_dir: "desc",
      exclude_archived: true,
    },
    {
      query: { enabled: !!teamId },
      request: { credentials: "include" },
    },
  );

  const guides = guidesQuery.data?.data ?? [];

  if (!guides.length && !guidesQuery.isLoading) {
    return (
      <div className="overflow-hidden surface-card rounded-[20px]">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h3 className="text-[14px] font-semibold text-foreground">Recent Guides</h3>
          </div>
        </div>
        <Empty className="border-0 px-6 py-10">
          <EmptyMedia variant="icon">
            <FileText className="size-5" />
          </EmptyMedia>
          <EmptyHeader className="max-w-full">
            <EmptyTitle>No recent guides</EmptyTitle>
            <EmptyDescription>Guides you create or edit will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-[20px] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h3 className="text-[14px] font-semibold text-foreground">Recent Guides</h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => navigate({ to: "/dashboard/guides" })}
        >
          View all
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {guides.map((guide) => (
          <GuideCard key={guide.id} guide={guide} onStarToggle={toggleStar} showActions={false} />
        ))}
      </div>
    </div>
  );
}
