import { useEffect, useState } from "react";

import { useForm, useStore } from "@tanstack/react-form";
import { CheckCircle2, Lock, MousePointerClick, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	defaultExtensionSettings,
	type ExtensionSettings,
	extensionSettingsSchema,
} from "@/models";

type SettingsViewProps = {
	settings: ExtensionSettings | undefined;
	onUpdate: (payload: Partial<ExtensionSettings>) => void;
};

export function SettingsView({ settings, onUpdate }: SettingsViewProps) {
	const [saved, setSaved] = useState<boolean>(false);

	const form = useForm({
		defaultValues: defaultExtensionSettings,
		validators: { onChange: extensionSettingsSchema },
	});

	const isDirty = useStore(form.store, (state) => state.isDirty);
	const formValues = useStore(form.store, (state) => state.values);

	useEffect(() => {
		if (settings) {
			form.reset(settings);
		}
	}, [settings, form.reset]);

	if (!settings) {
		return (
			<div className="flex items-center justify-center py-8">
				<p className="text-[11px] text-muted-foreground">Loading settings...</p>
			</div>
		);
	}

	const handleSave = () => {
		onUpdate(formValues);
		form.reset(formValues);
		setSaved(true);
	};

	const handleReset = () => {
		form.reset(settings);
		setSaved(false);
	};

	return (
		<Card size="sm" className="overflow-hidden border-border/60 shadow-sm">
			<CardContent className="flex flex-col gap-0 p-0">
				{/* Masking Section — PRO Feature */}
				<div className="px-4 py-3">
					<div className="mb-2.5 flex items-center gap-1.5">
						<Shield className="size-3.5 text-muted-foreground" />
						<span className="text-[11px] font-semibold">Masking</span>
						<Badge
							variant="outline"
							className="ml-auto h-4.5 gap-1 px-1.5 text-[9px] font-normal bg-linear-to-r from-purple-500/10 to-purple-600/15 text-purple-600 border-purple-300/30"
						>
							<Lock className="size-2.5" />
							PRO
						</Badge>
					</div>
					<div className="flex items-center justify-between rounded-md px-2.5 py-2 opacity-50">
						<Label className="text-[11px] font-normal leading-none text-muted-foreground cursor-not-allowed">
							Enable masking
						</Label>
						<Switch size="sm" disabled checked={false} />
					</div>
					<p className="px-2.5 pt-1 text-[10px] leading-relaxed text-muted-foreground/70">
						Upgrade to CliqRelay PRO to hide sensitive data like passwords and
						personal info from your captures.
					</p>
				</div>
			</CardContent>

			{isDirty && (
				<CardFooter className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
					<Button variant="ghost" size="xs" onClick={handleReset}>
						Reset
					</Button>
					<Button size="xs" onClick={handleSave}>
						Save Changes
					</Button>
				</CardFooter>
			)}
			{saved && !isDirty && (
				<CardFooter className="border-t border-border/50 px-4 py-2.5">
					<span className="flex items-center gap-1.5 text-[10px] text-green-600 animate-in fade-in slide-in-from-bottom-0.5 duration-300">
						<CheckCircle2 className="size-3.5" />
						Settings saved
					</span>
				</CardFooter>
			)}
		</Card>
	);
}
