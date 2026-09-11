import { MoreHorizontalIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
	label: string;
	onSelect: () => void;
};

export function StepCardMenu({ label, onSelect }: Props) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-xs"
					className="-mr-1 -mt-1 shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
				>
					<MoreHorizontalIcon className="size-3.5" />
					<span className="sr-only">Step actions</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem variant="destructive" onClick={onSelect}>
					<Trash2Icon className="size-3.5" />
					{label}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
