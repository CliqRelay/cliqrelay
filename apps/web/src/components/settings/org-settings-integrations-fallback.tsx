import { Plug, Zap, Webhook, Shield } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { envClient } from "@/constants/env-client";
import { Separator } from "../ui/separator";

export function OrgSettingsIntegrationsFallback() {
	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Connect CliqRelay to your team's everyday tools and automated
						workflows
					</p>
				</div>
			</div>

			<Card className="border-dashed">
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						Automations
					</CardTitle>
					<CardDescription>
						Automate guide distribution and enforce enterprise security
						standards
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ul className="space-y-3 text-sm text-muted-foreground">
						<li className="flex items-center gap-3">
							<Zap size={16} className="shrink-0 text-muted-foreground" />
							<span>
								<strong className="font-medium text-foreground">
									Workflow Automation Platforms
								</strong>
								{" — "}Trigger external workflows and sync documentation across
								your toolstack
							</span>
						</li>
						<li className="flex items-center gap-3">
							<Webhook size={16} className="shrink-0 text-muted-foreground" />
							<span>
								<strong className="font-medium text-foreground">
									Outbound Webhooks
								</strong>
								{" — "}Receive real-time HTTP callbacks when guides are created,
								published, or updated
							</span>
						</li>
						<li className="flex items-center gap-3">
							<Shield size={16} className="shrink-0 text-muted-foreground" />
							<span>
								<strong className="font-medium text-foreground">
									SAML SSO & Directory Sync
								</strong>
								{" — "}Enforce Okta, Azure AD, or Google Workspace single
								sign-on for your team
							</span>
						</li>
					</ul>
					<Separator />
					<a
						href={envClient.siteUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-sky-500 hover:underline"
					>
						Learn About {envClient.appName} Pro
					</a>
				</CardContent>
			</Card>
		</div>
	);
}
