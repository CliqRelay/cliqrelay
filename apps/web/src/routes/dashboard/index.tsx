import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, FileText, MailQuestion } from "lucide-react";

import { api } from "@repo/api-client";
import { formatTimeSaved } from "@repo/data-commons";
import { ExtensionSlot } from "@repo/extensions-sdk";

import { Kpi } from "@/components/dashboard";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
							variant="default"
							className="w-full justify-start gap-3 h-auto py-3 px-4"
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
				<CardFooter className="justify-center text-sm text-muted-foreground">
					You can switch organizations using the dropdown in the header
				</CardFooter>
			</Card>
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

	if (!loaded) {
		return (
			<div className="space-y-6 p-6">
				<div className="flex items-center justify-between">
					<div>
						<Skeleton className="h-8 w-48" />
						<Skeleton className="mt-2 h-4 w-32" />
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="rounded-xl border p-6 space-y-3">
						<Skeleton className="h-12 w-12 rounded-xl" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-32" />
					</div>
					<div className="rounded-xl border p-6 space-y-3">
						<Skeleton className="h-12 w-12 rounded-xl" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-32" />
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

	const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;

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
							<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
								{activeTeam.name}
							</Badge>
						</div>
					) : activeTeamId === null ? (
						<p className="mt-1 text-sm text-muted-foreground">No team found</p>
					) : (
						<div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
							<Skeleton className="h-4 w-32" />
						</div>
					)}
				</div>
			</div>

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
