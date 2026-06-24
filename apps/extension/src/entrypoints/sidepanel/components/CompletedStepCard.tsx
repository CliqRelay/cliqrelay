import { motion } from "framer-motion";
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react";

import { StepAction } from "@repo/api-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StepJobProgress } from "@/models";
import { ScreenshotDisplay } from "./ScreenshotDisplay";
import { mapCaptureActionToReadableAction } from "@/utils/action-text";
import { StepActionBadge } from "./StepActionBadge";

type Props = {
	step: StepJobProgress;
	stepNumber: number;
	onDelete?: (stepId: string, actionText?: string | null) => void;
};

export function CompletedStepCard({ step, stepNumber, onDelete }: Props) {
	const actionText =
		step.actionText ??
		`${mapCaptureActionToReadableAction(step.action as StepAction) || "Capture"} "${step.url || "unknown"}"`;

	const targetElement = step.targetElement as
		| Record<string, unknown>
		| undefined;
	const rawClickX = targetElement?.clickX as number | undefined;
	const rawClickY = targetElement?.clickY as number | undefined;
	const vpw = targetElement?.viewportWidth as number | undefined;
	const vph = targetElement?.viewportHeight as number | undefined;

	return (
		<motion.div
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.15 }}
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
							<span className="mt-2 text-xs font-medium text-foreground/90 text-center wrap-break-word break-all">
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
										onClick={() => onDelete(step.stepId!, step.actionText)}
									>
										<Trash2Icon className="size-3.5" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
					{step.screenshotUrl && (
						<ScreenshotDisplay
							screenshotUrl={step.screenshotUrl}
							thumbnail={step.thumbnail}
							clickX={rawClickX}
							clickY={rawClickY}
							viewportWidth={vpw}
							viewportHeight={vph}
						/>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}
