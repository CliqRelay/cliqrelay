import { ChevronLeft } from "lucide-react";

import { api } from "@repo/api-client";

import { Button } from "@/components/ui/button";
import { PersistedGuideView } from "./PersistedGuideView";

type Props = {
	guideId: string;
	onBack: () => void;
};

export function ViewedGuidePanel({ guideId, onBack }: Props) {
	// Deduped with the identical query inside PersistedGuideView, so this costs
	// no extra request.
	const { data: guideData } = api.guides.useGetGuideById(guideId, {
		query: { enabled: !!guideId },
		request: { credentials: "include" },
	});

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-2">
			<div className="flex min-w-0 shrink-0 items-center gap-1.5">
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={onBack}
					aria-label="Back to capture session"
				>
					<ChevronLeft />
				</Button>
				<span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
					{guideData?.guide?.title ?? "Guide"}
				</span>
			</div>
			<PersistedGuideView activeGuideId={guideId} />
		</div>
	);
}
