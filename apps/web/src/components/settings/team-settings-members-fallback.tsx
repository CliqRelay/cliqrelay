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

type Props = {
	isUpgradeAvailable: boolean;
	onUpgrade?: () => Promise<void>;
};

export function TeamSettingsMembersFallback({
	isUpgradeAvailable = false,
	onUpgrade,
}: Props) {
	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Members</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage who has access to this team
					</p>
				</div>
			</div>

			<Card className="border-dashed">
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Lock size={16} className="text-muted-foreground" />
						Unlock Team Member Management
					</CardTitle>
					<CardDescription>
						Upgrade to Pro to add and manage members within your teams.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							<Users size={14} className="shrink-0" />
							Add organization members to specific teams
						</li>
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							View team member roles and access levels
						</li>
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Keep guides and workflows scoped to your team
						</li>
					</ul>
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
