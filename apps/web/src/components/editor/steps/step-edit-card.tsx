import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	Camera,
	CopyIcon,
	GripVerticalIcon,
	MoreHorizontalIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";

import type { Step } from "@repo/api-client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { StepTypeOption } from "@/models";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { StepListItem } from "./step-list-item";
import { StepItemForm } from "./step-item-form";
import { StepTypeDock } from "./step-type-dock";

type EditableStepItemActions = {
	onSelect?: (stepId: string | null) => void;
	onUpdate?: (stepId: string, updates: Record<string, unknown>) => void;
	onDelete?: (stepId: string) => void;
	onDuplicate?: (stepId: string) => void;
	onRecapture?: (stepId: string) => void;
	onAddStepBeforeWithType?: (stepId: string, type: StepTypeOption) => void;
};

type Props = {
	step: Step;
	stepNumber: number;
	selectedStepId?: string | null;
	actions?: EditableStepItemActions;
};

export function StepEditCard({
	step,
	stepNumber,
	selectedStepId,
	actions,
}: Props) {
	const {
		onSelect,
		onUpdate,
		onDelete,
		onDuplicate,
		onRecapture,
		onAddStepBeforeWithType,
	} = actions ?? {};
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: step.id });

	const dndContext = useDndContext();
	const hasActiveDrag = dndContext?.active != null;

	const style = {
		transform: hasActiveDrag ? CSS.Transform.toString(transform) : undefined,
		transition,
	};

	const isSelected = selectedStepId === step.id;

	return (
		<>
			{onAddStepBeforeWithType && (
				<div className="pl-6">
					<StepTypeDock
						onSelect={(type) => onAddStepBeforeWithType(step.id, type)}
					>
						<Button
							variant="outline"
							size="sm"
							className="w-full border-dashed text-muted-foreground hover:text-foreground"
						>
							<PlusIcon className="mr-1 h-4 w-4" />
							Add Step
						</Button>
					</StepTypeDock>
				</div>
			)}

			<div
				ref={setNodeRef}
				style={style}
				className="group flex items-start gap-2"
			>
				<div
					className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-grab touch-none"
					{...attributes}
					{...listeners}
					aria-label="Drag to reorder"
				>
					<GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
				</div>

				<Card
					className={cn(
						"relative flex-1 cursor-pointer",
						!step.mediaAssets?.length && "gap-0",
						isDragging && "opacity-20",
						isSelected && "ring-2 ring-primary/30 border-primary",
					)}
					onClick={() => onSelect?.(isSelected ? null : step.id)}
				>
					<CardHeader
						className={cn(
							"flex flex-row justify-start items-center gap-4",
							!!step.mediaAssets?.length && "border-b",
						)}
					>
						{step.type !== "canvas" && (
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-base font-bold text-foreground border border-muted-foreground">
									{stepNumber}
								</div>
								{!isSelected && (
									<h3 className="text-base font-semibold tracking-tight">
										{step.actionText ?? `Step ${stepNumber + 1}`}
									</h3>
								)}
							</div>
						)}
					</CardHeader>
					<CardContent className="mt-2 space-y-4">
						<div className={cn(!isSelected && "hidden")}>
							<StepItemForm
								step={step}
								index={stepNumber}
								onUpdate={onUpdate}
							/>
						</div>
						<div className={cn(isSelected && "hidden")}>
							<StepListItem step={step} />
						</div>
					</CardContent>

					<div className="absolute right-3 top-3 flex items-center gap-1">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon-xs"
									className={cn(
										"shrink-0",
										isSelected
											? "opacity-100"
											: "opacity-0 group-hover:opacity-100",
									)}
									onClick={(e) => e.stopPropagation()}
								>
									<MoreHorizontalIcon className="h-3.5 w-3.5" />
									<span className="sr-only">Step actions</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{onRecapture && step.type !== "canvas" && (
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											onRecapture(step.id);
										}}
									>
										<Camera className="h-3.5 w-3.5" />
										Recapture
									</DropdownMenuItem>
								)}
								{onDuplicate && (
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											onDuplicate(step.id);
										}}
									>
										<CopyIcon className="h-3.5 w-3.5" />
										Duplicate
									</DropdownMenuItem>
								)}
								{onDelete && (
									<DropdownMenuItem
										variant="destructive"
										onClick={(e) => {
											e.stopPropagation();
											onDelete(step.id);
										}}
									>
										<Trash2Icon className="h-3.5 w-3.5" />
										Delete
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</Card>
			</div>
		</>
	);
}
