import { useForm, useStore } from "@tanstack/react-form";

import { toast } from "@/lib/toast";
import { createGuide } from "@/server-fns/guides";
import { useTeamStore } from "@/stores/team-store";

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
				toast.error("Validation Error", {
					description: "Title is required",
				});
				return;
			}
			try {
				const teamId = useTeamStore.getState().activeTeamId ?? "";
				const guide = await createGuide({ data: { ...value, teamId } });
				toast("Success", { description: "Guide created" });
				form.reset();
				onOpenChange(false);
				if (guide) {
					onSuccess?.(guide.id);
				}
			} catch (error) {
				toast.error("Error", {
					description:
						error instanceof Error ? error.message : "An error occurred",
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
