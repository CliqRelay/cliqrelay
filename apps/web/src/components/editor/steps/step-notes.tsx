import { StickyNoteIcon } from "lucide-react";

type StepNotesProps = {
  notes: string;
};

export function StepNotes({ notes }: StepNotesProps) {
  const content = notes.trim();
  if (!content) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <StickyNoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">{content}</p>
    </div>
  );
}
