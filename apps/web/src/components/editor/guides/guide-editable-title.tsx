import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useInlineEditField } from "@/hooks/useInlineEditField";

type Props = {
	title: string;
	isEditMode: boolean;
	onUpdate?: (title: string) => void;
	isEditing: boolean;
	onStartEditing: () => void;
	onStopEditing: () => void;
};

export function GuideEditableTitle({
	title,
	isEditMode,
	onUpdate,
	isEditing,
	onStartEditing,
	onStopEditing,
}: Props) {
	const field = useInlineEditField(title, (value) => {
		onUpdate?.(value);
	});

	if (isEditMode && isEditing) {
		return (
			<Input
				autoFocus
				value={field.localValue}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={() => {
					field.flush();
					onStopEditing();
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") (e.target as HTMLInputElement).blur();
					if (e.key === "Escape") {
						field.cancelEditing();
						onStopEditing();
					}
				}}
				className="w-full text-4xl font-bold tracking-tight text-foreground bg-transparent border-b-2 border-primary/30 outline-none p-4 h-auto focus-visible:ring-0"
			/>
		);
	}

	return (
		<h1
			className={cn(
				"text-4xl font-bold tracking-tight text-foreground",
				isEditMode &&
					"cursor-pointer rounded-md transition-colors hover:bg-muted/50 px-1 -mx-1",
			)}
			onClick={() => {
				if (isEditMode) {
					field.startEditing();
					onStartEditing();
				}
			}}
		>
			{field.localValue || "Add a title..."}
		</h1>
	);
}
