import { StickyNoteIcon } from "lucide-react";

type StepNotesProps = {
	notes: string;
};

export function StepNotes({ notes }: StepNotesProps) {
	return (
		<div className="mb-4 flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2">
			<StickyNoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			<p className="text-xs leading-relaxed text-muted-foreground">{notes}</p>
		</div>
	);
}
