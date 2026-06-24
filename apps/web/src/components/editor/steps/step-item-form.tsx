import { useEffect } from "react";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import type { Step } from "@repo/api-client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { CanvasStepForm } from "./canvas-step-form";
import { StepMedia } from "./step-media";

const stepFormSchema = z.object({
	actionText: z.string(),
	notes: z.string(),
});

type StepFormValues = z.infer<typeof stepFormSchema>;

type StepItemFormProps = {
	step: Step;
	index: number;
	onUpdate?: (stepId: string, updates: Record<string, unknown>) => void;
};

export function StepItemForm({ step, onUpdate }: StepItemFormProps) {
	const form = useForm({
		defaultValues: {
			actionText: step.actionText ?? "",
			notes: step.notes ?? "",
		},
		validators: { onChange: stepFormSchema },
	});

	useEffect(() => {
		const newDefaults: StepFormValues = {
			actionText: step.actionText ?? "",
			notes: step.notes ?? "",
		};
		form.reset(newDefaults);
	}, [form.reset, step.actionText, step.notes]);

	const debouncedSave = useDebouncedSave(step.id, onUpdate ?? (() => {}));

	if (step.type === "canvas") {
		return <CanvasStepForm step={step} onUpdate={onUpdate} />;
	}

	return (
		<>
			<div className="mb-4">
				<label className="mb-2 block text-xs font-medium text-muted-foreground">
					Action Text
				</label>
				<form.Field name="actionText">
					{(field) => (
						<Input
							value={field.state.value}
							onChange={(e) => {
								field.handleChange(e.target.value);
								debouncedSave("actionText", e.target.value);
							}}
							onBlur={field.handleBlur}
							onClick={(e) => e.stopPropagation()}
							placeholder="e.g., Submit button, Email field"
						/>
					)}
				</form.Field>
			</div>

			<StepMedia step={step} />

			<div>
				<label className="mb-2 block text-xs font-medium text-muted-foreground">
					Notes
				</label>
				<form.Field name="notes">
					{(field) => (
						<Textarea
							value={field.state.value}
							onChange={(e) => {
								field.handleChange(e.target.value);
								debouncedSave("notes", e.target.value);
							}}
							onBlur={field.handleBlur}
							onClick={(e) => e.stopPropagation()}
							placeholder="Internal notes about this step"
							rows={2}
						/>
					)}
				</form.Field>
			</div>
		</>
	);
}
