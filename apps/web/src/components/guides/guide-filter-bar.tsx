import { Button } from "@/components/ui/button";
import { useGuidesStore } from "@/store/guides-store";

const filterOptions = [
	{ value: "all" as const, label: "All" },
	{ value: "draft" as const, label: "Draft" },
	{ value: "published" as const, label: "Published" },
	{ value: "archived" as const, label: "Archived" },
];

export function GuideFilterBar() {
	const filter = useGuidesStore((state) => state.filter);
	const setFilter = useGuidesStore((state) => state.setFilter);

	return (
		<div className="flex items-center gap-2">
			{filterOptions.map((option) => (
				<Button
					key={option.value}
					variant={filter === option.value ? "default" : "outline"}
					size="sm"
					onClick={() => setFilter(option.value)}
					className={
						filter !== option.value ? "text-muted-foreground" : undefined
					}
				>
					{option.label}
				</Button>
			))}
		</div>
	);
}
