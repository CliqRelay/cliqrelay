import { useEffect, useRef, useState } from "react";

import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import { Button } from "@/components/ui/button";
import type { StepTypeOption } from "@/models";
import { StepDragOverlay } from "../steps/step-drag-overlay";
import { StepEditCard } from "../steps/step-edit-card";
import { StepTypeDock } from "../steps/step-type-dock";

type Props = {
	steps: Step[];
	selectedStepId?: string | null;
	onSelectStep?: (stepId: string | null) => void;
	onUpdateStep?: (stepId: string, updates: Record<string, unknown>) => void;
	onAddStepWithType?: (type: StepTypeOption) => void;
	onAddStepBeforeWithType?: (stepId: string, type: StepTypeOption) => void;
	onDeleteStep?: (stepId: string) => void;
	onDuplicateStep?: (stepId: string) => void;
	onRecaptureStep?: (stepId: string) => void;
	onReorderSteps?: (
		targetStepId: string,
		prevStepId: string | null,
		nextStepId: string | null,
	) => void;
};

export function GuideWorkflowTimeline({
	steps,
	selectedStepId,
	onSelectStep,
	onUpdateStep,
	onAddStepWithType,
	onAddStepBeforeWithType,
	onDeleteStep,
	onDuplicateStep,
	onRecaptureStep,
	onReorderSteps,
}: Props) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const sortedSteps = [...steps];
	const stepsMap = new Map(
		steps
			.filter((step) => step.type === "interaction")
			.map((step, index) => [step.id, index + 1]),
	);

	const timelineRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!selectedStepId) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (
				timelineRef.current &&
				!timelineRef.current.contains(e.target as Node)
			) {
				onSelectStep?.(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [selectedStepId, onSelectStep]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveId(null);

		if (!onReorderSteps) {
			return;
		}

		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}

		const oldIndex = sortedSteps.findIndex((s) => s.id === active.id);
		const newIndex = sortedSteps.findIndex((s) => s.id === over.id);
		if (oldIndex === -1 || newIndex === -1) {
			return;
		}

		const targetStepId = active.id as string;
		let prevStepId: string | null;
		let nextStepId: string | null;

		if (oldIndex < newIndex) {
			// Dragging DOWN: place target AFTER the over item
			prevStepId = sortedSteps[newIndex].id;
			nextStepId =
				newIndex + 1 < sortedSteps.length ? sortedSteps[newIndex + 1].id : null;
		} else {
			// Dragging UP: place target BEFORE the over item
			prevStepId = newIndex > 0 ? sortedSteps[newIndex - 1].id : null;
			nextStepId = sortedSteps[newIndex].id;
		}

		onReorderSteps(targetStepId, prevStepId, nextStepId);
	};

	const handleDragCancel = () => {
		setActiveId(null);
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<SortableContext
				items={sortedSteps.map((s) => s.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="relative mt-10 flex flex-col gap-6" ref={timelineRef}>
					{sortedSteps.map((step, index) => (
						<StepEditCard
							key={step.id}
							step={step}
							stepNumber={stepsMap.get(step.id) ?? index + 1}
							selectedStepId={selectedStepId}
							actions={{
								onSelect: onSelectStep,
								onUpdate: onUpdateStep,
								onDelete: onDeleteStep,
								onDuplicate: onDuplicateStep,
								onRecapture: onRecaptureStep,
								onAddStepBeforeWithType: onAddStepBeforeWithType,
							}}
						/>
					))}

					{onAddStepWithType && (
						<StepTypeDock onSelect={(type) => onAddStepWithType(type)}>
							<div className="w-full pl-6 flex flex-row">
								<Button
									variant="outline"
									size="sm"
									className="w-full border-dashed text-muted-foreground hover:text-foreground"
								>
									<PlusIcon className="mr-1 h-4 w-4" />
									Add Step
								</Button>
							</div>
						</StepTypeDock>
					)}
				</div>
			</SortableContext>
			<DragOverlay>
				{activeId
					? (() => {
							const activeStep = sortedSteps.find((s) => s.id === activeId);
							const activeIndex = sortedSteps.findIndex(
								(s) => s.id === activeId,
							);
							if (!activeStep) return null;
							return <StepDragOverlay step={activeStep} index={activeIndex} />;
						})()
					: null}
			</DragOverlay>
		</DndContext>
	);
}
