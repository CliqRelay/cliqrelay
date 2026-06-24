import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StepInfo = {
	id: string;
	actionText?: string | null;
};

type Props = {
	step: StepInfo | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
};

export function DeleteStepDialog({
	step,
	open,
	onOpenChange,
	onConfirm,
}: Props) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Step</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete "
						{step?.actionText ?? "this step"}
						"? This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
