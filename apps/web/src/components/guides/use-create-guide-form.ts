import { useForm, useStore } from "@tanstack/react-form";

import { toast } from "@/hooks/use-toast";
import { useTeamStore } from "@/stores/team-store";
import { createGuide } from "@/server-fns/guides";

type UseCreateGuideFormOptions = {
	onSuccess?: (guideId: string) => void;
	onOpenChange: (open: boolean) => void;
};

export function useCreateGuideForm({
	onSuccess,
	onOpenChange,
}: UseCreateGuideFormOptions) {
	const form = useForm({
		defaultValues: { title: "", description: "" },
		onSubmit: async ({ value }) => {
			if (!value.title?.trim()) {
				toast({
					title: "Validation Error",
					description: "Title is required",
					variant: "destructive",
				});
				return;
			}
			try {
				const teamId = useTeamStore.getState().activeTeamId ?? "";
				const guide = await createGuide({ data: { ...value, teamId } });
				toast({ title: "Success", description: "Guide created" });
				form.reset();
				onOpenChange(false);
				if (guide) {
					onSuccess?.(guide.id);
				}
			} catch (error) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "An error occurred",
					variant: "destructive",
				});
			}
		},
	});

	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
	const titleError = useStore(form.store, (state) =>
		state.fieldMeta.title?.errors?.join(", "),
	);

	return { form, isSubmitting, titleError };
}
