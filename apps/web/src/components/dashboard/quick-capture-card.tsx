import { ChevronRight, Circle, MousePointerClick, Zap } from "lucide-react";

import { CliqRelayEvents } from "@repo/data-commons";

import { envClient } from "@/constants/env-client";
import useExtensionRuntime from "@/hooks/use-extension-runtime";
import { toast } from "@/lib/toast";
import { Button } from "../ui/button";

export function QuickCaptureCard() {
	const runtime = useExtensionRuntime();

	return (
		<div className="rounded-[20px] p-5 flex flex-col items-center text-center relative gap-4 bg-[var(--surface-1)] border border-[rgba(3,160,236,0.08)] shadow-[var(--shadow-elevated)]">
			<div className="w-full flex items-center gap-2 text-left">
				<Zap className="size-4 text-primary" />
				<h3 className="text-[14px] font-semibold text-foreground">
					Quick Capture
				</h3>
			</div>
			<div className="mt-5 relative w-full">
				<div className="absolute inset-0 bg-[radial-gradient(circle,rgba(3,160,236,0.10)_0%,transparent_70%)] blur-lg pointer-events-none" />
				<div className="mx-auto w-45 h-27.5 rounded-lg relative bg-linear-to-br from-surface-2 to-surface-1 border border-border">
					<div className="flex gap-1 p-2">
						<span className="size-1.5 rounded-full bg-(--icon-dots)" />
						<span className="size-1.5 rounded-full bg-(--icon-dots)" />
						<span className="size-1.5 rounded-full bg-(--icon-dots)" />
					</div>
					<MousePointerClick
						className="absolute right-4 bottom-4 size-6 text-primary"
						strokeWidth={1.8}
					/>
				</div>
			</div>
			<h4 className="mt-4 text-[15px] font-semibold text-foreground">
				Capture anything.
			</h4>
			<p className="mt-1 text-[12px] text-muted-foreground leading-relaxed max-w-60">
				Record your screen, and we'll turn it into a step-by-step guide
				instantly.
			</p>
			<Button
				type="button"
				className="group mt-auto w-full h-10 rounded-md text-[13px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-[1.08] bg-linear-to-br from-[#234DF0] to-[#03A0EC] border border-[rgba(3,160,236,0.18)] shadow-(--shadow-primary) cursor-pointer"
				onClick={async () => {
					if (!runtime.isAvailable()) {
						toast.error("Extension Not Found", {
							description:
								"The CliqRelay extension is not installed. Install it first to start capturing guides.",
						});
						return;
					}

					try {
						const response = await runtime.sendMessage<{
							success: boolean;
							requiresToolbarClick?: boolean;
						}>(envClient.extensionId, {
							action: CliqRelayEvents.OPEN_SIDE_PANEL,
						});

						if (response?.success) {
							if (response.requiresToolbarClick) {
								toast("Almost there!", {
									description:
										"Click the CliqRelay icon in your browser toolbar to open the sidebar and start capturing.",
								});
							} else {
								toast.success("Side Panel Opened", {
									description:
										"The side panel has been opened. You can start capturing your guide steps there.",
								});
							}
						} else {
							toast.error("Failed to Open Side Panel", {
								description:
									"An error occurred while opening the side panel. Please try again.",
							});
						}
					} catch (error: any) {
						toast.error("Failed to Open Side Panel", {
							description: error.message || "Unknown error",
						});
					}
				}}
			>
				<Circle className="size-3.5 fill-white" />
				Start Capturing
				<ChevronRight className="size-3.5 text-white/70 transition-transform group-hover:translate-x-1" />
			</Button>
		</div>
	);
}
