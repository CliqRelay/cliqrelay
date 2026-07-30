import { Clock, Eye, FileText } from "lucide-react";

import { api } from "@repo/api-client";
import { formatCompactNumber, formatTimeSaved } from "@repo/data-commons";

export function StatsCards({ teamId }: { teamId?: string }) {
	const guidesCountQuery = api.guides.useGetGuidesCount(
		teamId ? { team_id: teamId } : undefined,
		{
			query: { enabled: !!teamId },
			request: { credentials: "include" },
		},
	);

	const guideViewsQuery = api.guides.useGetGuideViewsCount(
		{ team_id: teamId },
		{
			query: { enabled: !!teamId },
			request: { credentials: "include" },
		},
	);

	const count = guidesCountQuery.data?.count ?? 0;
	const timeSaved = count ? formatTimeSaved(count * 15) : 0;
	const viewCount = guideViewsQuery.data?.count ?? 0;

	const stats = [
		{
			label: "Captured Guides",
			value: count.toString(),
			icon: FileText,
			isLoading: guidesCountQuery.isLoading,
		},
		{
			label: "Time Saved",
			value: timeSaved,
			icon: Clock,
			isLoading: guidesCountQuery.isLoading,
		},
		{
			label: "Guide Views",
			value: formatCompactNumber(viewCount),
			icon: Eye,
			isLoading: guideViewsQuery.isLoading,
		},
	];

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
			{stats.map((stat) => {
				const Icon = stat.icon;
				return (
					<div
						key={stat.label}
						className="grid place-items-center surface-card rounded-[20px] p-5"
					>
						<div className="flex items-center gap-2">
							<div className="size-8 rounded-full flex items-center justify-center bg-(--icon-subtle)">
								<Icon className="text-primary size-5" />
							</div>
							<span className="text-[12.5px] text-muted-foreground">
								{stat.label}
							</span>
						</div>
						<div className="mt-5 flex items-end justify-between">
							<div>
								<div className="text-[32px] font-semibold tracking-tight text-foreground leading-none">
									{stat.value}
								</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
