import { Textarea } from "@/components/ui/textarea";
import { useInlineEditField } from "@/hooks/useInlineEditField";
import { cn } from "@/lib/utils";

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
  const field = useInlineEditField(description ?? "", isEditing, (value) => {
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
        className="mt-3 w-full resize-none border-b-2 border-primary/30 bg-transparent text-lg leading-relaxed text-muted-foreground outline-none"
      />
    );
  }

  if (!field.localValue && !isEditMode) return null;

  return (
    <p
      className={cn(
        "mt-3 text-lg leading-relaxed text-muted-foreground",
        isEditMode && "-mx-1 cursor-pointer rounded-md px-1 transition-colors hover:bg-muted/50",
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
