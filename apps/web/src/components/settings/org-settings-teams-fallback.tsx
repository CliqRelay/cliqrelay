import { Lock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { envClient } from "@/constants/env-client";
import { Separator } from "../ui/separator";

type Props = {
	isUpgradeAvailable: boolean;
	onUpgrade?: () => Promise<void>;
};

export function OrgSettingsTeamsFallback({
	isUpgradeAvailable = false,
	onUpgrade,
}: Props) {
	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Teams</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage teams across your organization
					</p>
				</div>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Team Management</CardTitle>
					<CardDescription>
						Create and manage teams to organize your workspace
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border bg-muted/30 p-4">
						<div className="flex items-center gap-3">
							<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
								<Users size={14} className="text-primary" />
							</div>
							<div>
								<p className="text-sm font-medium">Organization Teams</p>
								<p className="text-xs text-muted-foreground">
									Teams are created by organization owners and admins
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="border-dashed">
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Lock size={16} className="text-muted-foreground" />
						Unlock Team Management
					</CardTitle>
					<CardDescription>
						Upgrade to Pro to create teams, manage members, and organize your
						workspace.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Create multiple teams for different departments
						</li>
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Assign members to specific teams
						</li>
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Keep guides and workflows scoped to the right team
						</li>
					</ul>
					<Separator />
					{isUpgradeAvailable ? (
						<Button className="w-full" onClick={() => onUpgrade?.()}>
							Upgrade to Pro
						</Button>
					) : (
						<a
							href={envClient.siteUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-sky-500 hover:underline"
						>
							Learn About {envClient.appName} Pro
						</a>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
