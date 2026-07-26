import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authulaClient } from "@/lib/authula-client";
import { useOrgStore } from "@/stores/org-store";

export function OrganizationSettingsGeneralSection() {
	const orgId = useOrgStore((state) => state.orgId);
	const orgName = useOrgStore((state) => state.orgName);
	const setOrg = useOrgStore((state) => state.setOrg);
	const organizations = useOrgStore((state) => state.organizations);
	const setOrganizations = useOrgStore((state) => state.setOrganizations);
	const [name, setName] = useState<string>(orgName ?? "");
	const [saving, setSaving] = useState<boolean>(false);

	const handleSave = async () => {
		try {
			if (!orgId || !name.trim()) {
				return;
			}
			setSaving(true);
			const org = await authulaClient.organizations.updateOrganization(orgId, {
				name: name.trim(),
			});
			setOrg(orgId, name.trim(), org?.ownerId ?? "");
			setOrganizations(
				organizations.map((o) =>
					o.id === orgId ? { ...o, name: name.trim() } : o,
				),
			);
			toast.success("Organization name updated");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to update organization",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">General</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Manage your organization's basic settings
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Organization Name</CardTitle>
					<CardDescription>
						This is the name displayed across your organization
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="org-name">Name</Label>
						<Input
							id="org-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="My Organization"
							className="max-w-md"
						/>
					</div>
					<Button
						onClick={handleSave}
						disabled={saving || !name.trim() || name === orgName}
					>
						{saving ? "Saving..." : "Save"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
