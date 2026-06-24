import { useState } from "react";

import { toast } from "@/hooks/use-toast";
import {
	archiveGuide,
	deleteGuide,
	permanentlyDeleteGuide,
	publishGuide,
	restoreGuide,
	unarchiveGuide,
	unpublishGuide,
} from "@/server-fns/guides";

type ConfirmActionType = "publish" | "unpublish" | "archive" | "unarchive" | "delete" | "restore" | "permanently-delete" | null;

const actionMessages: Record<string, string> = {
	publish: "Guide published",
	unpublish: "Guide unpublished",
	archive: "Guide archived",
	unarchive: "Guide unarchived",
	restore: "Guide restored",
	duplicate: "Guide duplicated",
	delete: "Guide deleted",
	"permanently-delete": "Guide permanently deleted",
};

export function useGuideActions(onAction?: (action: string) => void) {
	const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);
	const [loading, setLoading] = useState<boolean>(false);

	const execute = async (action: string, fn: () => Promise<unknown>) => {
		setLoading(true);
		try {
			await fn();
			toast({
				title: "Success",
				description: actionMessages[action] ?? "Action completed",
			});
			setConfirmAction(null);
			onAction?.(action);
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "An error occurred",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const confirm = (guideId: string) => {
		if (!confirmAction) return;
		const serverFns: Record<string, (id: string) => Promise<unknown>> = {
			publish: (id) => publishGuide({ data: { guideId: id } }),
			unpublish: (id) => unpublishGuide({ data: { guideId: id } }),
			archive: (id) => archiveGuide({ data: { guideId: id } }),
			unarchive: (id) => unarchiveGuide({ data: { guideId: id } }),
			delete: (id) => deleteGuide({ data: { guideId: id } }),
			restore: (id) => restoreGuide({ data: { guideId: id } }),
			"permanently-delete": (id) => permanentlyDeleteGuide({ data: { guideId: id } }),
		};
		execute(confirmAction, () => serverFns[confirmAction](guideId));
	};

	const restore = (guideId: string) => {
		execute("restore", () => restoreGuide({ data: { guideId } }));
	};

	return {
		confirmAction,
		setConfirmAction,
		loading,
		confirm,
		restore,
	};
}
