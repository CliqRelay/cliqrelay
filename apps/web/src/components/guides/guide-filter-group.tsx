import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FilterOption } from "@/stores";

interface GuideFilterGroupProps {
	filter: FilterOption;
	onFilterChange: (filter: FilterOption) => void;
}

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "draft", label: "Draft" },
	{ value: "published", label: "Published" },
	{ value: "archived", label: "Archived" },
];

export function GuideFilterGroup({
	filter,
	onFilterChange,
}: GuideFilterGroupProps) {
	return (
		<Tabs
			value={filter}
			onValueChange={(v) => onFilterChange(v as FilterOption)}
		>
			<TabsList className="min-w-xs p-1 border border-muted-background">
				{FILTER_OPTIONS.map((opt) => (
					<TabsTrigger key={opt.value} value={opt.value}>
						{opt.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}
