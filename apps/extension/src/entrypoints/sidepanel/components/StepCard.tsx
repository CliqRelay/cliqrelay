import type { ReactNode } from "react";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getStepActionText } from "@/utils/action-text";
import { ScreenshotDisplay } from "./ScreenshotDisplay";
import { StepActionBadge } from "./StepActionBadge";

type Props = {
	stepNumber: number;
	action?: string | null;
	actionText?: string | null;
	url?: string | null;
	screenshotUrl?: string | null;
	thumbnail?: string | null;
	targetElement?: Record<string, unknown> | null;
	trailing?: ReactNode;
};

export function StepCard({
	stepNumber,
	action,
	actionText,
	url,
	screenshotUrl,
	thumbnail,
	targetElement,
	trailing,
}: Props) {
	const text = getStepActionText(actionText, action, url);
	const clickX = targetElement?.clickX as number | undefined;
	const clickY = targetElement?.clickY as number | undefined;
	const viewportWidth = targetElement?.viewportWidth as number | undefined;
	const viewportHeight = targetElement?.viewportHeight as number | undefined;

	return (
		<motion.div
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.15 }}
			layout
			className="w-full min-w-0"
		>
			<Card
				size="sm"
				className="w-full min-w-0 border-border/50 shadow-xs transition-shadow duration-200 hover:shadow-sm"
			>
				<CardContent className="flex min-w-0 flex-col gap-1.5">
					<div className="flex min-w-0 items-start justify-between gap-1.5">
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<div className="flex min-w-0 flex-wrap items-center gap-1.5">
								<Badge
									variant="outline"
									className="flex size-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px] font-semibold tabular-nums"
								>
									{stepNumber}
								</Badge>
								<StepActionBadge action={action} actionText={undefined} />
							</div>
							<span className="min-w-0 text-xs font-medium leading-snug text-foreground/90 wrap-anywhere">
								{text}
							</span>
						</div>
						{trailing && (
							<div className="flex shrink-0 items-center gap-1">{trailing}</div>
						)}
					</div>
					{screenshotUrl && (
						<ScreenshotDisplay
							screenshotUrl={screenshotUrl}
							thumbnail={thumbnail ?? undefined}
							clickX={clickX}
							clickY={clickY}
							viewportWidth={viewportWidth}
							viewportHeight={viewportHeight}
						/>
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}
