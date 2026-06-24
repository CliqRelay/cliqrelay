import { InfoIcon } from "lucide-react";

import type { Step } from "@repo/api-client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

function formatDate(date: string | Date | null | undefined) {
	if (!date) return "—";
	return new Date(date).toLocaleString();
}

type StepMetadataProps = {
	step: Step;
};

export function StepMetadata({ step }: StepMetadataProps) {
	return (
		<Accordion type="single" collapsible>
			<AccordionItem value="metadata" className="border-0">
				<AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
					<InfoIcon className="h-3 w-3" />
					Step metadata
				</AccordionTrigger>
				<AccordionContent>
					<div className="space-y-1.5 text-xs">
						<div className="flex justify-between">
							<span className="text-muted-foreground">ID</span>
							<span className="font-mono text-foreground/80">{step.id}</span>
						</div>
						{step.action && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">Action</span>
								<Badge
									variant="secondary"
									className="text-[10px] font-normal px-1.5 py-0"
								>
									{step.action}
								</Badge>
							</div>
						)}
						<div className="flex justify-between">
							<span className="text-muted-foreground">Sort order</span>
							<span className="text-foreground/80">{step.sortOrder}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Created</span>
							<span className="text-foreground/80">
								{formatDate(step.createdAt)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Updated</span>
							<span className="text-foreground/80">
								{formatDate(step.updatedAt)}
							</span>
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
