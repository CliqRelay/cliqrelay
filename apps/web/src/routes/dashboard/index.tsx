import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MailQuestion } from "lucide-react";

import { ExtensionSlot } from "@repo/extensions-sdk";

import { ActivityFeedFallback } from "@/components/dashboard/activity-feed-fallback";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { QuickCaptureCard } from "@/components/dashboard/quick-capture-card";
import { RecentGuides } from "@/components/dashboard/recent-guides";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgStore } from "@/stores/org-store";
import { useTeamStore } from "@/stores/team-store";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardPage,
});

function NoTeamsView({
	orgName,
	onRequestAccess,
}: {
	orgName: string | null;
	onRequestAccess: () => void;
}) {
	return (
		<div className="dashboard-page__wrapper">
			<div className="space-y-6 p-6">
				<Card className="w-full max-w-lg mx-auto mt-12">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl font-bold">
							👋 Welcome to {orgName ?? "your organization"}!
						</CardTitle>
						<CardDescription className="text-base mt-2">
							You're a member of this organization, but you haven't been
							assigned to a team yet.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-lg border bg-card p-4 space-y-3">
							<p className="text-sm font-medium text-muted-foreground">
								💡 What would you like to do next?
							</p>
							<Button
								variant="outline"
								className="w-full justify-start gap-3 h-auto py-3 px-4 cursor-pointer"
								onClick={onRequestAccess}
							>
								<MailQuestion size={18} />
								<div className="text-left">
									<div className="font-medium">✉️ Request Team Access</div>
									<div className="text-xs text-muted-foreground font-normal">
										Reach out to an org admin to get added to a team
									</div>
								</div>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function DashboardPage() {
	const navigate = useNavigate();
	const teams = useTeamStore((s) => s.teams);
	const loaded = useTeamStore((s) => s.loaded);
	const activeTeamId = useTeamStore((s) => s.activeTeamId);
	const orgName = useOrgStore((s) => s.orgName);
	const orgId = useOrgStore((s) => s.orgId);

	if (!loaded) {
		return (
			<div className="dashboard-page__wrapper">
				<div className="space-y-6">
					<Skeleton className="h-24 w-full rounded-[20px]" />
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-32.5 rounded-[20px]" />
						))}
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-32.5 rounded-[20px]" />
						))}
					</div>
				</div>
			</div>
		);
	}

	if (teams.length === 0) {
		return (
			<NoTeamsView
				orgName={orgName}
				onRequestAccess={() =>
					navigate({
						to: "/dashboard/organizations/$orgId/settings/members",
						params: { orgId: orgId ?? "" },
					})
				}
			/>
		);
	}

	return (
		<div className="dashboard-page__wrapper">
			<DashboardHero />
			<QuickActions />
			<StatsCards teamId={activeTeamId ?? undefined} />
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
				<RecentGuides teamId={activeTeamId ?? undefined} />
				<QuickCaptureCard />
				<ExtensionSlot
					name="dashboard-activity-feed"
					fallback={ActivityFeedFallback}
				/>
			</div>
		</div>
	);
}
