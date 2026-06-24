import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidePanelBridge } from "../../hooks/useSidePanelBridge";
import { useSidePanelStore } from "../../stores/sidepanel-store";
import { SettingsView } from "../../components";

export const Route = createFileRoute("/settings/")({
	component: Settings,
});

function Settings() {
	const bridge = useSidePanelBridge();
	const settings = useSidePanelStore((s) => s.settings);

	return (
		<div className="flex flex-col gap-4 p-2">
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="icon-xs" asChild>
					<Link
						to="/"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<span className="text-[13px] font-semibold">Settings</span>
			</div>
			<SettingsView settings={settings} onUpdate={bridge.updateSettings} />
		</div>
	);
}
