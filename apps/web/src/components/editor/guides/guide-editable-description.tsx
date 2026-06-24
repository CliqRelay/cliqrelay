import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useInlineEditField } from "@/hooks/useInlineEditField";

type Props = {
	description: string | null;
	isEditMode: boolean;
	onUpdate?: (description: string | null) => void;
	isEditing: boolean;
	onStartEditing: () => void;
	onStopEditing: () => void;
};

export function GuideEditableDescription({
	description,
	isEditMode,
	onUpdate,
	isEditing,
	onStartEditing,
	onStopEditing,
}: Props) {
	const field = useInlineEditField(description ?? "", (value) => {
		onUpdate?.(value || null);
	});

	if (isEditMode && isEditing) {
		return (
			<Textarea
				autoFocus
				value={field.localValue}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={() => {
					field.flush();
					onStopEditing();
				}}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						field.cancelEditing();
						onStopEditing();
					}
				}}
				rows={2}
				className="mt-3 w-full text-lg leading-relaxed text-muted-foreground bg-transparent border-b-2 border-primary/30 outline-none resize-none"
			/>
		);
	}

	if (!field.localValue && !isEditMode) return null;

	return (
		<p
			className={cn(
				"mt-3 text-lg leading-relaxed text-muted-foreground",
				isEditMode &&
					"cursor-pointer rounded-md transition-colors hover:bg-muted/50 px-1 -mx-1",
				!field.localValue && "text-muted-foreground/50 italic",
			)}
			onClick={() => {
				if (isEditMode) {
					field.startEditing();
					onStartEditing();
				}
			}}
		>
			{field.localValue || "Add a description..."}
		</p>
	);
}
