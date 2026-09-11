import { ChevronLeft } from "lucide-react";

import { api } from "@repo/api-client";
import { formatGuideDuration } from "@repo/data-commons";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGuideSteps } from "../hooks/useGuideSteps";
import { StepList } from "./StepList";

type Props = {
	activeGuideId: string;
	onBack?: () => void;
};

export function PersistedGuideView({ activeGuideId, onBack }: Props) {
	const { steps, isLoading, error, deleteStep } = useGuideSteps(activeGuideId);

	const { data: guideData } = api.guides.useGetGuideById(activeGuideId, {
		query: { enabled: !!activeGuideId },
		request: { credentials: "include" },
	});

	const durationSeconds = guideData?.guide?.durationSeconds;
	const stepCount = steps.length;

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
			<div className="flex min-w-0 shrink-0 items-center gap-1.5 px-4 py-2">
				{onBack && (
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={onBack}
						aria-label="Back to capture session"
					>
						<ChevronLeft />
					</Button>
				)}
				<span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground/80">
					{guideData?.guide?.title ?? "Guide"}
				</span>
				<span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
					{stepCount} step{stepCount !== 1 ? "s" : ""}
					{durationSeconds != null && ` · ${formatGuideDuration(durationSeconds)}`}
				</span>
			</div>

			<Separator />

			<div className="min-h-0 min-w-0 flex-1">
				<StepList
					mode="view"
					persistedSteps={steps}
					isLoading={isLoading}
					error={error}
					onDeleteStep={(id) => deleteStep(id)}
				/>
			</div>
		</div>
	);
}
