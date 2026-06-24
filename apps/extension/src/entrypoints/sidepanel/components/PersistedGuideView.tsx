import { api } from "@repo/api-client";
import { formatGuideDuration } from "@repo/data-commons";

import { useGuideSteps } from "../hooks/useGuideSteps";
import { StepList } from "./StepList";

type Props = {
	activeGuideId: string;
};

export function PersistedGuideView({ activeGuideId }: Props) {
	const { steps, isLoading, error, deleteStep } = useGuideSteps(activeGuideId);

	const { data: guideData } = api.guides.useGetGuideById(activeGuideId, {
		query: { enabled: !!activeGuideId },
		request: { credentials: "include" },
	});

	const durationSeconds = guideData?.guide?.durationSeconds;

	const handleDeleteStep = (id: string, _actionText?: string | null) => {
		deleteStep(id);
	};

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
			<div className="flex items-center gap-2 shrink-0">
				<span className="text-[13px] font-semibold text-foreground/80">
					Steps ({steps.length})
				</span>
				{durationSeconds != null && (
					<span className="text-[11px] text-muted-foreground">
						· {formatGuideDuration(durationSeconds)}
					</span>
				)}
			</div>
			<div className="min-h-0 flex-1">
				<StepList
					mode="view"
					persistedSteps={steps}
					isLoading={isLoading}
					error={error}
					onDeleteStep={handleDeleteStep}
				/>
			</div>
		</div>
	);
}
