import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, Star } from "lucide-react";

import { api } from "@repo/api-client";

import { GuideStatusBadge } from "@/components/guides/guide-status-badge";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { timeAgo } from "@/utils/time.utils";
import { Button } from "../ui/button";

export function RecentGuides({ teamId }: { teamId?: string }) {
	const navigate = useNavigate();

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
			<div className="surface-card rounded-[20px] overflow-hidden">
				<div className="flex items-center justify-between px-5 py-4">
					<div className="flex items-center gap-2">
						<FileText className="size-4 text-primary" />
						<h3 className="text-[14px] font-semibold text-foreground">
							Recent Guides
						</h3>
					</div>
				</div>
				<Empty className="border-0 px-6 py-10">
					<EmptyMedia variant="icon">
						<FileText className="size-5" />
					</EmptyMedia>
					<EmptyHeader className="max-w-full">
						<EmptyTitle>No recent guides</EmptyTitle>
						<EmptyDescription>
							Guides you create or edit will appear here.
						</EmptyDescription>
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
					<h3 className="text-[14px] font-semibold text-foreground">
						Recent Guides
					</h3>
				</div>
				<Button
					type="button"
					variant="ghost"
					className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
					onClick={() => navigate({ to: "/dashboard/guides" })}
				>
					View all
				</Button>
			</div>
			<div className="mt-2 flex flex-col gap-2">
				{guides.map((g) => (
					<Link
						key={g.id}
						to="/dashboard/guides/$guideId"
						params={{
							guideId: g.id,
						}}
						className="w-full px-4 py-3 flex items-center gap-3 text-left rounded-md border border-muted transition-colors hover:bg-surface-hover hover:shadow-sm"
					>
						<div className="flex-1 min-w-0">
							<div className="text-[13px] font-medium text-foreground truncate">
								{g.title}
							</div>
							<div className="mt-1 flex items-center gap-1.5">
								<GuideStatusBadge status={g.status} />
								<span className="text-[11px] text-muted-foreground">
									Updated {timeAgo(g.updatedAt)}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-1.5 text-muted-foreground">
							{g.isStarred && (
								<Star className="size-4 text-yellow-500 fill-amber-500" />
							)}
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
