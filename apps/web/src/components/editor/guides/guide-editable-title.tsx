import { Input } from "@/components/ui/input";
import { useInlineEditField } from "@/hooks/useInlineEditField";
import { cn } from "@/lib/utils";

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
  const field = useInlineEditField(title, isEditing, (value) => {
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
        className="h-auto w-full border-b-2 border-primary/30 bg-transparent p-4 text-4xl font-bold tracking-tight text-foreground outline-none focus-visible:ring-0"
      />
    );
  }

  return (
    <h1
      className={cn(
        "text-4xl font-bold tracking-tight text-foreground",
        isEditMode && "-mx-1 cursor-pointer rounded-md px-1 transition-colors hover:bg-muted/50",
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
