import { useRef } from "react";

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

type ConfirmActionDialogProps = {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	variant?: "destructive";
	loading: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

export function ConfirmActionDialog({
	open,
	title,
	description,
	confirmLabel,
	variant,
	loading,
	onConfirm,
	onCancel,
}: ConfirmActionDialogProps) {
	const confirming = useRef<boolean>(false);

	if (open) {
		confirming.current = false;
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !confirming.current) {
					onCancel();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						disabled={loading}
						onClick={(e) => e.stopPropagation()}
					>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						variant={variant}
						disabled={loading}
						onClick={(e) => {
							e.stopPropagation();
							confirming.current = true;
							onConfirm();
						}}
					>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
