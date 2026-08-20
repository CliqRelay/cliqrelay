import { format } from "date-fns";
import { Clock, Hourglass, UserRound } from "lucide-react";

import type { Guide } from "@repo/api-client";
import {
	formatGuideCreationTime,
	formatGuideDuration,
} from "@repo/data-commons";

import { Card, CardContent } from "@/components/ui/card";

type Props = {
	guide: Guide;
	stepCount: number;
};

export function GuideMetadataCard({ guide, stepCount }: Props) {
	return (
		<Card className="mt-4 p-0 max-w-max">
			<CardContent className="px-4 py-2 flex flex-row items-center gap-4 text-xs text-muted-foreground *:border-r *:pr-4 *:last:border-r-0">
				{guide.creator?.name && (
					<span className="flex items-center gap-1">
						<UserRound className="h-3 w-3" />
						{guide.creator.name}
					</span>
				)}
				<span className="flex items-center gap-1">
					{stepCount} step
					{stepCount !== 1 ? "s" : ""}
				</span>
				<span className="flex flex-row items-center gap-1">
					<Hourglass className="h-3 w-3" />
					{formatGuideDuration(guide.durationSeconds)}
				</span>
				<span className="flex flex-row items-center gap-1">
					<Clock className="h-3 w-3" />
					{`${formatGuideCreationTime(guide.createdAt)} ago`}
				</span>
				{guide.updatedAt && (
					<span>
						Updated {format(new Date(guide.updatedAt), "MMM d, yyyy")}
					</span>
				)}
			</CardContent>
		</Card>
	);
}
