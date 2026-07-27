import { Lock, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useOrgStore } from "@/stores/org-store";

export function OrgMembersFallback() {
	const orgName = useOrgStore((state) => state.orgName);

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Members</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage who has access to your organization
					</p>
				</div>
				<Button disabled className="opacity-60">
					<Lock className="mr-2 h-4 w-4" />
					Invite Member
				</Button>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-base">Current Members</CardTitle>
							<CardDescription>1 member in your organization</CardDescription>
						</div>
						<span className="text-xs text-muted-foreground">
							Free tier: 1/1 seats
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<div className="rounded-lg border bg-muted/30 p-4">
						<p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
							Active Seat
						</p>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
									<Users size={14} className="text-primary" />
								</div>
								<div>
									<p className="text-sm font-medium">
										You (Organization Owner)
									</p>
									<p className="text-xs text-muted-foreground">{orgName}</p>
								</div>
							</div>
							<span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
								Owner
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="border-dashed">
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Lock size={16} className="text-muted-foreground" />
						Unlock Team Collaboration
					</CardTitle>
					<CardDescription>
						Upgrade to Pro to invite team members, assign roles, and manage
						seats.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Invite unlimited team members
						</li>
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Fine-grained role assignments (Admin, Editor, Viewer)
						</li>
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Centralized seat management & billing
						</li>
					</ul>
					<Button className="w-full">Upgrade to Pro</Button>
				</CardContent>
			</Card>
		</div>
	);
}
