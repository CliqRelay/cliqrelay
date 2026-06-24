import { useState, type ReactNode } from "react";

import {
	FileText,
	Lightbulb,
	MousePointerClick,
	Quote,
	TriangleAlert,
} from "lucide-react";

import type { StepTypeOption } from "@/models";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

type StepOption = {
	value: StepTypeOption;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
};

const options: StepOption[] = [
	{
		value: "step",
		label: "Step",
		description: "A browser interaction step (click, input, navigation)",
		icon: MousePointerClick,
	},
	{
		value: "header",
		label: "Header",
		description: "A section heading to organize your guide",
		icon: FileText,
	},
	{
		value: "tip",
		label: "Tip",
		description: "A helpful tip or best practice",
		icon: Lightbulb,
	},
	{
		value: "callout",
		label: "Callout",
		description: "An important note or emphasis",
		icon: Quote,
	},
	{
		value: "alert",
		label: "Alert",
		description: "A warning or caution",
		icon: TriangleAlert,
	},
];

type Props = {
	onSelect: (type: StepTypeOption) => void;
	children: ReactNode;
};

export function StepTypeDock({ onSelect, children }: Props) {
	const [open, setOpen] = useState(false);

	const handleSelect = (type: StepTypeOption) => {
		onSelect(type);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent className="w-72 p-2" align="start">
				<div className="flex flex-col gap-1">
					{options.map((option) => {
						const Icon = option.icon;
						return (
							<button
								key={option.value}
								type="button"
								className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
								onClick={() => handleSelect(option.value)}
							>
								<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<div className="flex flex-col">
									<span className="font-medium">{option.label}</span>
									<span className="text-xs text-muted-foreground">
										{option.description}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
