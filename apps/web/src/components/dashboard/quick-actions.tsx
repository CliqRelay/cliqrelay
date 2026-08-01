import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	ChevronRight,
	Circle,
	FilePlus,
	LayoutTemplate,
	type LucideIcon,
	Upload,
} from "lucide-react";

import { api } from "@repo/api-client";
import {
	AppUserRole,
	CliqRelayEvents,
	hasMinimumRole,
} from "@repo/data-commons";

import SoonBadge from "@/components/shared/coming-soon-badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { envClient } from "@/constants/env-client";
import useExtensionRuntime from "@/hooks/use-extension-runtime";
import { toast } from "@/lib/toast";
import { createGuide } from "@/server-fns/guides";
import { useOrgStore, useTeamStore } from "@/stores";

type QuickActionItem = {
	label: string;
	sub: string;
	icon: LucideIcon;
	primary?: boolean;
	comingSoon?: boolean;
	disabled?: boolean;
	onClick?: () => void;
};

export function QuickActions() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const runtime = useExtensionRuntime();
	const teamId = useTeamStore((state) => state.activeTeamId);

	const currentMemberRole = useOrgStore((s) => s.currentMember?.role);
	const canCreate =
		!!currentMemberRole &&
		hasMinimumRole(currentMemberRole as AppUserRole, AppUserRole.EDITOR);

	const openSidePanel = async () => {
		try {
			if (!runtime.isAvailable()) {
				toast.error("Extension Not Found", {
					description:
						"The CliqRelay extension is not installed. Install it first to start capturing guides.",
				});
				return;
			}

			const response = await runtime.sendMessage<{
				success: boolean;
				requiresToolbarClick?: boolean;
			}>(envClient.extensionId, { action: CliqRelayEvents.OPEN_SIDE_PANEL });

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
	};

	const handleNewBlankGuide = async () => {
		if (!teamId) {
			toast.error("No Active Team", {
				description: "Please select a team before creating a guide.",
			});
			return;
		}

		try {
			const guide = await createGuide({
				data: { title: "Untitled Guide", teamId },
			});

			if (guide) {
				queryClient.invalidateQueries({
					queryKey: api.guides.getGetAllGuidesQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: api.guides.getGetGuidesCountQueryKey(),
				});
				navigate({
					to: "/dashboard/guides/$guideId",
					params: { guideId: guide.id },
				});
			} else {
				toast.error("Failed to Create Guide", {
					description: "Could not create the guide. Please try again.",
				});
			}
		} catch (error: any) {
			toast.error("Failed to Create Guide", {
				description: error.message || "Unknown error",
			});
		}
	};

	const quickActions: QuickActionItem[] = [
		{
			label: "Capture Guide",
			sub: "Start recording your workflow",
			icon: Circle,
			primary: true,
			onClick: openSidePanel,
		},
		{
			label: "New Blank Guide",
			sub: "Create manually without recording",
			icon: FilePlus,
			disabled: !canCreate,
			onClick: handleNewBlankGuide,
		},
		{
			label: "Import",
			sub: "Import from JSON",
			icon: Upload,
			comingSoon: true,
			onClick: () =>
				toast("Coming Soon", {
					description: "Importing guides is not yet available.",
				}),
		},
		{
			label: "Templates",
			sub: "Use pre-made templates",
			icon: LayoutTemplate,
			comingSoon: true,
			onClick: () =>
				toast("Coming Soon", {
					description: "Templates are not yet available.",
				}),
		},
	];

	return (
		<div className="rounded-[20px] p-4 mb-8 surface-card">
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-row xl:flex-wrap xl:justify-between xl:items-center gap-4">
				{quickActions.map((quickActionItem) => {
					const Icon = quickActionItem.icon;
					const handleClick = () => quickActionItem.onClick?.();
					if (quickActionItem.primary) {
						return (
							<button
								key={quickActionItem.label}
								type="button"
								className="flex-1 group relative text-left rounded-[20px] p-4 h-32.5 flex flex-col justify-between surface-card surface-card-hover bg-linear-to-br from-[#234DF0] to-[#03A0EC] border border-[rgba(3,160,236,0.18)] shadow-(--shadow-primary)"
								onClick={handleClick}
							>
								<div className="relative size-8 rounded-2xl flex items-center justify-center bg-white/10">
									<Icon className="size-4 text-white" strokeWidth={2.2} />
								</div>
								<div>
									<div className="text-[14px] font-semibold text-white">
										{quickActionItem.label}
									</div>
									<div className="text-[11.5px] text-white/70 mt-0.5">
										{quickActionItem.sub}
									</div>
								</div>
								<span className="flex items-center justify-center absolute right-3.5 top-1/2 -translate-y-1/2 size-10 bg-white/20 text-white/70 transition-transform group-hover:translate-x-0.5 rounded-full">
									<ChevronRight className="size-5 text-white" />
								</span>
							</button>
						);
					}
					if (quickActionItem.disabled) {
						return (
							<Tooltip key={quickActionItem.label}>
								<TooltipTrigger asChild>
									<span className="flex-1 cursor-not-allowed">
										<button
											type="button"
											disabled
											className="flex-1 w-full group text-left rounded-[20px] p-4 h-32.5 flex flex-col justify-between surface-card surface-card-hover opacity-50 cursor-not-allowed"
										>
											<div className="flex items-start justify-between">
												<div className="size-11 rounded-2xl flex items-center justify-center bg-(--icon-subtle)">
													<Icon
														className="size-6 text-primary transition-colors"
														strokeWidth={1.9}
													/>
												</div>
												{quickActionItem.comingSoon && <SoonBadge />}
											</div>
											<div>
												<div className="text-[14px] font-semibold text-foreground">
													{quickActionItem.label}
												</div>
												<div className="text-[11.5px] text-muted-foreground mt-0.5">
													{quickActionItem.sub}
												</div>
											</div>
										</button>
									</span>
								</TooltipTrigger>
								<TooltipContent>
									Only Admins and Editors can create guides.
								</TooltipContent>
							</Tooltip>
						);
					}
					return (
						<button
							key={quickActionItem.label}
							type="button"
							className={`flex-1 group text-left rounded-[20px] p-4 h-32.5 flex flex-col justify-between surface-card surface-card-hover ${quickActionItem.comingSoon ? "opacity-50" : ""}`}
							onClick={handleClick}
						>
							<div className="flex items-start justify-between">
								<div className="size-11 rounded-2xl flex items-center justify-center bg-(--icon-subtle)">
									<Icon
										className="size-6 text-primary transition-colors"
										strokeWidth={1.9}
									/>
								</div>
								{quickActionItem.comingSoon && <SoonBadge />}
							</div>
							<div>
								<div className="text-[14px] font-semibold text-foreground">
									{quickActionItem.label}
								</div>
								<div className="text-[11.5px] text-muted-foreground mt-0.5">
									{quickActionItem.sub}
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
