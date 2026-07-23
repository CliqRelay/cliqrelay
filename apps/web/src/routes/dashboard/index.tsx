import { createFileRoute } from "@tanstack/react-router";
import { Building2, Clock, FileText } from "lucide-react";

import { api } from "@repo/api-client";
import { formatTimeSaved } from "@repo/data-commons";
import { ExtensionSlot } from "@repo/extensions-sdk";

import { Kpi, OnboardingChecklist } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamStore } from "@/stores/team-store";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	const activeTeamId = useTeamStore((s) => s.activeTeamId);
	const teams = useTeamStore((s) => s.teams);
	const activeTeam =
		teams.find((team) => team.id === activeTeamId) ?? null;

	const guidesCountQuery = api.guides.useGetGuidesCount(
		activeTeamId ? { team_id: activeTeamId } : undefined,
		{
			query: {
				enabled: !!activeTeamId,
			},
			request: {
				credentials: "include",
			},
		},
	);

	const timeSaved = guidesCountQuery.data?.count
		? formatTimeSaved(guidesCountQuery.data.count * 15)
		: "N/A";

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
					{activeTeam ? (
						<div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
							<Building2 className="h-3.5 w-3.5" />
							<span>{activeTeam.name}</span>
							<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
								Team
							</Badge>
						</div>
					) : activeTeamId === null ? (
						<p className="mt-1 text-sm text-muted-foreground">
							No team found
						</p>
					) : (
						<div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
							<Skeleton className="h-4 w-32" />
						</div>
					)}
				</div>
			</div>

			<OnboardingChecklist />

			<ExtensionSlot name="testcomp" />

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Kpi
					icon={FileText}
					label="Total Guides"
					value={
						guidesCountQuery.data ? `${guidesCountQuery.data.count} Guides` : ""
					}
					isLoading={guidesCountQuery.isLoading}
				/>
				<Kpi
					icon={Clock}
					label="Time Saved"
					value={timeSaved}
					isLoading={guidesCountQuery.isLoading}
				/>
			</div>
		</div>
	);
}
