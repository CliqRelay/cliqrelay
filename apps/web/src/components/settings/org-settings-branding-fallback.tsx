import { Lock, Palette } from "lucide-react";

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

export function OrgSettingsBrandingFallback({
	isUpgradeAvailable = false,
	onUpgrade,
}: Props) {
	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Branding</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Customize your organization's visual identity
					</p>
				</div>
			</div>

			<Card className="border-dashed">
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Lock size={16} className="text-muted-foreground" />
						Custom Branding
					</CardTitle>
					<CardDescription>
						Customize your organization's logo, colors, and domain on the
						Enterprise plan.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li className="flex items-center gap-2">
							<Palette size={14} className="shrink-0" />
							<span>Upload your organization logo and favicon</span>
						</li>
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Custom primary and accent colors
						</li>
						<li className="flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-primary" />
							Remove CliqRelay watermark
						</li>
					</ul>
					<Separator />
					{isUpgradeAvailable ? (
						<Button className="w-full" onClick={() => onUpgrade?.()}>
							Upgrade to Enterprise
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
