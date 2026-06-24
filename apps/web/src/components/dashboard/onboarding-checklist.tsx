import { useEffect, useState, type ReactNode } from "react";

import { useNavigate } from "@tanstack/react-router";
import {
	MousePointerClick,
	Eye,
	Puzzle,
	Check,
	FolderPlus,
	Video,
	FileText,
	MousePointer2,
} from "lucide-react";

import { CliqRelayEvents } from "@repo/data-commons";

import { envClient } from "@/constants/env-client";
import { cn } from "@/lib/utils";
import { createDemoGuide } from "@/server-fns/guides";
import { useOnboardingStore } from "@/store/onboarding-store";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { OnboardingChecklistItemType } from "@/models";

function InstallExtensionCard() {
	return (
		<div className="w-full h-full rounded-md bg-white dark:bg-slate-800 border border-border shadow-sm flex flex-col">
			<div className="h-6 border-b border-border flex items-center gap-1 px-2">
				<span className="w-1.5 h-1.5 rounded-full bg-red-400" />
				<span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
				<span className="w-1.5 h-1.5 rounded-full bg-green-400" />
				<div className="ml-2 flex-1 h-2 rounded bg-slate-100 dark:bg-slate-700" />
			</div>
			<div className="flex-1 flex items-center justify-center gap-2">
				<img src="/app-icon-logo.svg" alt="App Icon Logo" className="h-6 w-6" />
				<Puzzle size={18} className="text-slate-400" />
			</div>
		</div>
	);
}

function ViewDemoGuideCard() {
	return (
		<div className="w-full h-full rounded-md bg-white dark:bg-slate-800 border border-border shadow-sm p-3 flex flex-col gap-2">
			<div className="text-[11px] font-semibold">Getting Started</div>
			<div className="flex items-center gap-1.5">
				<div className="w-3 h-3 rounded-full bg-sky-100 dark:bg-sky-900" />
				<div className="h-1.5 flex-1 rounded bg-slate-100 dark:bg-slate-700" />
			</div>
			<div className="mt-1 rounded bg-slate-50 dark:bg-slate-900 border border-border p-2 flex items-center gap-2 relative">
				<div className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center">
					1
				</div>
				<div className="h-1.5 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
				<MousePointer2
					size={14}
					className="absolute right-2 bottom-1 text-sky-500 fill-sky-500"
				/>
			</div>
		</div>
	);
}

function CaptureGuideCard() {
	return (
		<div className="w-full h-full rounded-md bg-white dark:bg-slate-800 border border-border shadow-sm p-3 flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
				<span className="text-[10px] font-medium text-muted-foreground">
					Recording
				</span>
			</div>
			<div className="flex-1 grid grid-cols-3 gap-1.5">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="rounded bg-slate-50 dark:bg-slate-900 border border-border flex flex-col items-center justify-center gap-1"
					>
						<div className="w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center">
							{i}
						</div>
						<div className="h-1 w-6 rounded bg-slate-200 dark:bg-slate-700" />
					</div>
				))}
			</div>
		</div>
	);
}

type ChecklistItem = {
	type: OnboardingChecklistItemType;
	step: number;
	icon: typeof MousePointerClick;
	label: string;
	description: string;
	stepDescription: string;
	colour: string;
	bgColour: string;
	cta: { label: string; icon: ReactNode };
	preview: ReactNode;
	action?: () => void | Promise<void>;
};

export function OnboardingChecklist() {
	const navigate = useNavigate();

	const { toast } = useToast();
	const completedSteps = useOnboardingStore((s) => s.completedSteps);
	const completeStep = useOnboardingStore((s) => s.completeStep);
	const hydrated = useOnboardingStore((s) => s.hydrated);
	const rehydrate = useOnboardingStore((s) => s.rehydrate);

	const [loadingId, setLoadingId] = useState<string | null>(null);

	const isDevMode = import.meta.env.MODE === "development";

	useEffect(() => {
		const handleEvents = () => {
			if (!chrome?.runtime) {
				return;
			}

			chrome.runtime.sendMessage(
				envClient.extensionId,
				{
					action: CliqRelayEvents.PING,
				},
				(response) => {
					if (response?.success) {
						completeStep("install-extension");
					}
				},
			);
		};

		handleEvents();
	}, [completeStep]);

	useEffect(() => {
		rehydrate();
	}, [rehydrate]);

	if (!hydrated) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-3 w-48" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="flex flex-col items-center gap-3 rounded-xl border border-hairline bg-surface p-6"
							>
								<Skeleton className="h-12 w-12 rounded-xl" />
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-3 w-32" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	const items: ChecklistItem[] = [
		{
			type: "install-extension",
			step: 1,
			icon: Puzzle,
			label: "Install Extension",
			description: "Add the CliqRelay browser extension",
			stepDescription: "You'll need the extension to capture guides.",
			colour: "text-emerald-500",
			bgColour: "bg-emerald-500/10",
			cta: { label: "Get Extension", icon: <Puzzle size={14} /> },
			preview: <InstallExtensionCard />,
			action: () => {
				if (completedSteps.includes("install-extension")) {
					return;
				}

				if (isDevMode) {
					toast({
						title: "Import Extension",
						description:
							"Enable 'Developer mode' in chrome extensions and import the extension.",
					});
				} else {
					window.open(
						`https://chromewebstore.google.com/detail/${envClient.extensionId}`,
						"_blank",
						"noopener=true,noreferrer=true",
					);
				}
			},
		},
		{
			type: "view-example",
			step: 2,
			icon: Eye,
			label: "View Example",
			description: "See a pre-made guide with sample steps",
			stepDescription: "See a pre-made guide with sample steps.",
			colour: "text-purple-500",
			bgColour: "bg-purple-500/10",
			cta: { label: "View Example", icon: <Eye size={16} /> },
			preview: <ViewDemoGuideCard />,
			action: () => {
				toast.promise(createDemoGuide, {
					loading: "Creating demo guide...",
					success: (guideId: string | null) => {
						if (!guideId) {
							return null;
						}
						completeStep("view-example");
						navigate({
							to: "/dashboard/guides/$guideId",
							params: { guideId },
						});
						return "Demo guide created.";
					},
					error: "Failed to Create Guide",
				});
			},
		},
		{
			type: "capture-guide",
			step: 3,
			icon: MousePointerClick,
			label: "Capture a Guide",
			description: "Capture your first guide step by step",
			stepDescription: "Capture your first guide step by step.",
			colour: "text-brand",
			bgColour: "bg-brand/10",
			cta: { label: "Start Capturing", icon: <Video size={16} /> },
			preview: <CaptureGuideCard />,
			action: () => {
				if (!chrome?.runtime) {
					toast({
						title: "Extension Not Found",
						description:
							"The CliqRelay extension is not installed. Install it first to start capturing guides.",
						variant: "destructive",
					});
					return;
				}

				chrome.runtime.sendMessage(
					envClient.extensionId,
					{
						action: CliqRelayEvents.OPEN_SIDE_PANEL,
					},
					(response) => {
						if (chrome.runtime.lastError) {
							toast({
								title: "Extension Not Installed",
								description:
									"Install the CliqRelay extension first, then try again.",
								variant: "destructive",
							});
							return;
						}

						if (response?.success) {
							toast({
								title: "Side Panel Opened",
								description:
									"The side panel has been opened. You can start capturing your guide steps there.",
							});
							completeStep("capture-guide");
						} else {
							toast({
								title: "Failed to Open Side Panel",
								description:
									"An error occurred while opening the side panel. Please try again.",
								variant: "destructive",
							});
						}
					},
				);
			},
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Get Started</CardTitle>
				<CardDescription>
					Complete these steps to start creating guides
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{items.map((item) => {
						const isCompleted = completedSteps.includes(item.type);
						const isLoading = loadingId === item.type;

						return (
							<div
								key={item.type}
								className={cn(
									"group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-200",
									isCompleted
										? "opacity-40"
										: "shadow-sm hover:border-brand/40 hover:shadow-md",
								)}
							>
								<div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-md bg-sky-500 text-white flex items-center justify-center shadow-sm">
									<span className="text-xs font-semibold">{item.step}</span>
								</div>

								<div className="h-48 p-4 pt-12 bg-linear-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-b border-border flex items-center justify-center overflow-hidden">
									{item.preview}
								</div>

								<div className="flex flex-1 flex-col p-4 gap-4 items-start">
									<div>
										<div className="font-semibold text-sm">{item.label}</div>
										<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
											{item.stepDescription}
										</p>
									</div>
									<button
										type="button"
										disabled={isCompleted || isLoading}
										className={cn(
											"mt-auto w-full flex items-center justify-center gap-2 rounded-md border border-border bg-background hover:bg-accent text-xs font-medium py-2 transition-colors",
											isLoading && "animate-pulse",
										)}
										onClick={async () => {
											setLoadingId(item.type);
											try {
												if (!item?.action) {
													toast({
														title: "Note",
														description:
															"Install the extension first to start capturing a guide.",
													});
													return;
												}
												await item.action?.();
											} finally {
												setLoadingId(null);
											}
										}}
									>
										{item.cta.icon}
										{item.cta.label}
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
