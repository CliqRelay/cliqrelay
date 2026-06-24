import { useEffect } from "react";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import type { Step } from "@repo/api-client";

import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { StepMedia } from "./step-media";

const canvasFormSchema = z.object({
	headingText: z.string(),
	bodyText: z.string(),
});

type CanvasFormValues = z.infer<typeof canvasFormSchema>;

const CANVAS_TYPE_OPTIONS = [
	{ value: "tip", label: "Tip" },
	{ value: "callout", label: "Callout" },
	{ value: "alert", label: "Alert" },
	{ value: "header", label: "Header" },
] as const;

type CanvasStepFormProps = {
	step: Step;
	onUpdate?: (stepId: string, updates: Record<string, unknown>) => void;
};

export function CanvasStepForm({ step, onUpdate }: CanvasStepFormProps) {
	const form = useForm({
		defaultValues: {
			headingText: step.canvasContent?.headingText ?? "",
			bodyText: step.canvasContent?.bodyText ?? "",
		},
		validators: { onChange: canvasFormSchema },
	});

	useEffect(() => {
		const newDefaults: CanvasFormValues = {
			headingText: step.canvasContent?.headingText ?? "",
			bodyText: step.canvasContent?.bodyText ?? "",
		};
		form.reset(newDefaults);
	}, [
		form.reset,
		step.canvasContent?.headingText,
		step.canvasContent?.bodyText,
	]);

	const debouncedSave = useDebouncedSave(step.id, onUpdate ?? (() => {}));

	const canvasType = step.canvasContent?.type ?? "tip";
	const isHeader = canvasType === "header";

	return (
		<>
			<div className="mb-4">
				<label className="mb-1 block text-xs font-medium text-muted-foreground">
					Type
				</label>
				<Select
					value={canvasType}
					onValueChange={(value) => {
						onUpdate?.(step.id, {
							canvasContent: {
								type: value,
								headingText: step.canvasContent?.headingText ?? "",
								bodyText: step.canvasContent?.bodyText ?? "",
							},
						});
					}}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{CANVAS_TYPE_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="mb-4">
				<label className="mb-1 block text-xs font-medium text-muted-foreground">
					Heading
				</label>
				<form.Field name="headingText">
					{(field) => (
						<Input
							value={field.state.value}
							onChange={(e) => {
								field.handleChange(e.target.value);
								debouncedSave("canvasContent", {
									type: canvasType,
									headingText: e.target.value,
									bodyText: form.getFieldValue("bodyText"),
								});
							}}
							onBlur={field.handleBlur}
							onClick={(e) => e.stopPropagation()}
							placeholder={isHeader ? "Section heading" : "Alert heading text"}
						/>
					)}
				</form.Field>
			</div>

			{!isHeader && (
				<>
					<div className="mb-4">
						<label className="mb-1 block text-xs font-medium text-muted-foreground">
							Body
						</label>
						<form.Field name="bodyText">
							{(field) => (
								<Textarea
									value={field.state.value}
									onChange={(e) => {
										field.handleChange(e.target.value);
										debouncedSave("canvasContent", {
											type: canvasType,
											headingText: form.getFieldValue("headingText"),
											bodyText: e.target.value,
										});
									}}
									onBlur={field.handleBlur}
									onClick={(e) => e.stopPropagation()}
									placeholder="Markdown body text"
									rows={3}
								/>
							)}
						</form.Field>
					</div>

					<StepMedia step={step} />
				</>
			)}
		</>
	);
}
