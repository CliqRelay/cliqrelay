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
	component: DashboardPageComponent,
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

function DashboardSkeleton() {
	return (
		<div className="dashboard-page__wrapper">
			<div className="space-y-6">
				<div className="mb-4">
					<Skeleton className="h-7 w-64" />
					<Skeleton className="mt-2 h-8 w-96" />
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
					<div className="rounded-[20px] p-4 h-32.5 flex flex-col justify-between surface-card">
						<Skeleton className="size-8 rounded-2xl" />
						<div>
							<Skeleton className="h-4 w-28" />
							<Skeleton className="mt-1.5 h-3 w-40" />
						</div>
					</div>
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="rounded-[20px] p-4 h-32.5 flex flex-col justify-between surface-card"
						>
							<div className="flex items-start justify-between">
								<Skeleton className="size-11 rounded-2xl" />
							</div>
							<div>
								<Skeleton className="h-4 w-24" />
								<Skeleton className="mt-1.5 h-3 w-32" />
							</div>
						</div>
					))}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{Array.from({ length: 2 }).map((_, i) => (
						<div key={i} className="surface-card rounded-[20px] p-5">
							<div className="flex items-center gap-2.5">
								<Skeleton className="size-8 rounded-full" />
								<Skeleton className="h-3 w-28" />
							</div>
							<div className="mt-5">
								<Skeleton className="h-8 w-16" />
							</div>
						</div>
					))}
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
					<div className="surface-card rounded-[20px] p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Skeleton className="size-4" />
								<Skeleton className="h-4 w-24" />
							</div>
						</div>
						<div className="mt-2 flex flex-col gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={i}
									className="w-full px-4 py-3 rounded-md border border-border"
								>
									<Skeleton className="h-4 w-48" />
									<div className="mt-1 flex items-center gap-1.5">
										<Skeleton className="h-5 w-14 rounded-md" />
										<Skeleton className="h-3 w-20" />
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-[20px] p-5 flex flex-col items-center text-center gap-4 surface-card">
						<div className="w-full flex items-center gap-2">
							<Skeleton className="size-4" />
							<Skeleton className="h-4 w-24" />
						</div>
						<Skeleton className="w-45 h-27.5 rounded-lg" />
						<Skeleton className="h-5 w-36" />
						<Skeleton className="h-3 w-56" />
						<Skeleton className="w-full h-10 rounded-md" />
					</div>

					<div className="surface-card rounded-[20px] p-5 flex flex-col">
						<div className="flex items-center gap-2">
							<Skeleton className="size-4" />
							<Skeleton className="h-4 w-40" />
						</div>
						<div className="p-5 space-y-3">
							<Skeleton className="h-3 w-48" />
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className="flex items-center gap-2.5">
									<Skeleton className="size-3.5 shrink-0" />
									<Skeleton className="h-3 w-44" />
								</div>
							))}
						</div>
						<Skeleton className="w-full h-10 rounded-md mt-auto" />
					</div>
				</div>
			</div>
		</div>
	);
}

function DashboardPageComponent() {
	const navigate = useNavigate();
	const teams = useTeamStore((s) => s.teams);
	const loaded = useTeamStore((s) => s.loaded);
	const activeTeamId = useTeamStore((s) => s.activeTeamId);
	const orgName = useOrgStore((s) => s.orgName);
	const orgId = useOrgStore((s) => s.orgId);

	if (!loaded) {
		return <DashboardSkeleton />;
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
