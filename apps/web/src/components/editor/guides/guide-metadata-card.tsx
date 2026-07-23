import { useEffect } from "react";

import { format } from "date-fns";
import { Clock, Hourglass, UserRound } from "lucide-react";

import {
	formatGuideCreationTime,
	formatGuideDuration,
} from "@repo/data-commons";
import { api, type Guide } from "@repo/api-client";

import type { AppUser } from "@/models/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCsrfTokenHeader } from "@/utils/http.utils";

type Props = {
	user: AppUser;
	guide: Guide;
	stepCount: number;
};

export function GuideMetadataCard({ user, guide, stepCount }: Props) {
	const mutation = api.guides.useRecalculateGuideDuration({
		request: {
			credentials: "include",
			headers: {
				...getCsrfTokenHeader(),
			},
		},
	});

	useEffect(() => {
		mutation.mutate({ id: guide.id });
	}, [guide.id, mutation.mutate]);

	const durationSeconds =
		mutation.data?.guide?.durationSeconds ?? guide.durationSeconds;

	return (
		<Card className="mt-4 p-0 max-w-max">
			<CardContent className="px-4 py-2 flex flex-row items-center gap-4 text-xs text-muted-foreground *:border-r *:pr-4 *:last:border-r-0">
				{user.id === guide.creatorId && (
					<span className="flex items-center gap-1">
						<UserRound className="h-3 w-3" />
						{user.name}
					</span>
				)}
				<span className="flex items-center gap-1">
					{stepCount} step
					{stepCount !== 1 ? "s" : ""}
				</span>
				<span className="flex flex-row items-center gap-1">
					<Hourglass className="h-3 w-3" />
					{mutation.isPending ? (
						<Skeleton className="h-3 w-16 inline-block" />
					) : (
						formatGuideDuration(durationSeconds)
					)}
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
