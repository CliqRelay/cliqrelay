import { motion } from "framer-motion";
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScreenshotDisplay } from "./ScreenshotDisplay";
import { StepActionBadge } from "./StepActionBadge";

type Props = {
	step: {
		id: string;
		action?: string | null;
		actionText?: string | null;
		url?: string | null;
		createdAt: string;
		mediaAssets?: Array<{ url?: string | null; thumbnail?: string | null }>;
		targetElement?: Record<string, unknown> | null;
	};
	stepNumber: number;
	onDelete?: (id: string, actionText?: string | null) => void;
};

export function StepCardView({ step, stepNumber, onDelete }: Props) {
	const actionText =
		step.actionText ?? `${step.action || "capture"} · ${step.url || "unknown"}`;

	const mediaUrl = step.mediaAssets?.[0]?.url ?? undefined;
	const thumbnail = step.mediaAssets?.[0]?.thumbnail ?? undefined;

	const targetElement = step.targetElement as
		| Record<string, unknown>
		| undefined
		| null;
	const rawClickX = targetElement?.clickX as number | undefined;
	const rawClickY = targetElement?.clickY as number | undefined;
	const vpw = targetElement?.viewportWidth as number | undefined;
	const vph = targetElement?.viewportHeight as number | undefined;

	return (
		<motion.div
			initial={{ opacity: 0, y: -4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: stepNumber * 0.03, duration: 0.2 }}
			layout
			className="group/card min-w-0"
		>
			<Card className="border-border/50 shadow-xs transition-shadow duration-200 hover:shadow-sm">
				<CardContent className="flex min-w-0 flex-col gap-1.5 p-2">
					<div className="flex items-start justify-between gap-1.5">
						<div className="flex min-w-0 flex-col gap-1">
							<div className="flex items-center gap-1.5">
								<Badge
									variant="outline"
									className="flex size-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px] font-bold tabular-nums"
								>
									{stepNumber}
								</Badge>
								<StepActionBadge action={step.action} actionText={undefined} />
							</div>
							<span className="truncate text-xs font-medium leading-snug text-foreground/90">
								{actionText}
							</span>
						</div>
						{onDelete && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon-xs"
										className="-mr-1 -mt-1 shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100 has-[data-state=open]:opacity-100"
									>
										<MoreHorizontalIcon className="size-3.5" />
										<span className="sr-only">Step actions</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										variant="destructive"
										onClick={() => onDelete(step.id, step.actionText)}
									>
										<Trash2Icon className="size-3.5" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
					{mediaUrl && (
						<ScreenshotDisplay
							screenshotUrl={mediaUrl}
							thumbnail={thumbnail}
							clickX={rawClickX}
							clickY={rawClickY}
							viewportWidth={vpw}
							viewportHeight={vph}
						/>
					)}
					{step.url && (
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
							<span className="truncate">{step.url}</span>
						</div>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}
