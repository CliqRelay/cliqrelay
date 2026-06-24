import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateGuideForm } from "./use-create-guide-form";

type CreateGuideDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated?: (guideId: string) => void;
};

export function CreateGuideDialog({
	open,
	onOpenChange,
	onCreated,
}: CreateGuideDialogProps) {
	const { form, isSubmitting, titleError } = useCreateGuideForm({
		onSuccess: onCreated,
		onOpenChange,
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Guide</DialogTitle>
					<DialogDescription>
						Start creating a new step-by-step guide
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<div className="space-y-4">
						<form.Field name="title">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="title">Title</Label>
									<Input
										id="title"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Enter guide title"
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="description">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="description">Description</Label>
									<Textarea
										id="description"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
										placeholder="Optional description"
										rows={3}
									/>
								</div>
							)}
						</form.Field>
					</div>
					{titleError && (
						<p className="mt-2 text-sm text-destructive">{titleError}</p>
					)}
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Guide"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
