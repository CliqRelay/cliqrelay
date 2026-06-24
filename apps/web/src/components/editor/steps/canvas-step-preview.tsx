import { InfoIcon, Quote, TriangleAlertIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

import type { Step } from "@repo/api-client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { StepMedia } from "./step-media";

type Props = {
	step: Step;
};

export function CanvasStepPreview({ step }: Props) {
	const canvasContent = step.canvasContent;
	if (!canvasContent) {
		return null;
	}

	if (canvasContent.type === "header") {
		return (
			<div className="relative py-6">
				<div className="flex items-center gap-4">
					<div className="h-px flex-1 bg-border" />
					<h2 className="text-lg font-semibold tracking-tight text-muted-foreground">
						{canvasContent.headingText}
					</h2>
					<div className="h-px flex-1 bg-border" />
				</div>
			</div>
		);
	}

	const iconMap = {
		tip: InfoIcon,
		callout: Quote,
		alert: TriangleAlertIcon,
	} as const;

	const alertBackgroundClassNameMap = {
		tip: "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30",
		callout: "border-l-4 border-gray-500 bg-gray-50 dark:bg-gray-950/30",
		alert: "border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30",
	} as const;
	const alertForegroundClassNameMap = {
		tip: "text-blue-700 dark:text-blue-300",
		callout: "text-gray-700 dark:text-gray-300",
		alert: "text-red-700 dark:text-red-300",
	} as const;

	const Icon = iconMap[canvasContent.type as keyof typeof iconMap] ?? InfoIcon;
	const alertBackgroundClassName =
		alertBackgroundClassNameMap[
			canvasContent.type as keyof typeof alertBackgroundClassNameMap
		] ?? "";
	const alertForegroundClassName =
		alertForegroundClassNameMap[
			canvasContent.type as keyof typeof alertForegroundClassNameMap
		] ?? "";

	const variant =
		canvasContent.type === "alert" ? "destructive" : ("default" as const);

	return (
		<>
			<Alert
				variant={variant}
				className={cn(
					"flex flex-row justify-start items-center",
					alertBackgroundClassName,
				)}
			>
				<span className="block mr-4">
					<Icon size={30} className={cn(alertForegroundClassName)} />
				</span>
				<span>
					{canvasContent.headingText && (
						<AlertTitle className={cn(alertForegroundClassName)}>
							{canvasContent.headingText}
						</AlertTitle>
					)}
					{canvasContent.bodyText && (
						<AlertDescription className={cn(alertForegroundClassName)}>
							<ReactMarkdown>{canvasContent.bodyText}</ReactMarkdown>
						</AlertDescription>
					)}
				</span>
			</Alert>
			<StepMedia step={step} />
		</>
	);
}
