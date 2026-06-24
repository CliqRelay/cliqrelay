import { useState } from "react";

import { Link, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { Star } from "lucide-react";

import { formatGuideDuration } from "@repo/data-commons";
import { ApiError, type Guide } from "@repo/api-client";

import { Badge } from "@/components/ui/badge";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { starGuide, unstarGuide } from "@/server-fns/starred-guides";
import { restoreGuide } from "@/server-fns/guides";
import { GuideCardActions } from "./guide-card-actions";
import { ConfirmActionDialog } from "./guide-confirm-action-dialog";
import { toast } from "@/hooks/use-toast";

type Props = {
	guide: Guide;
	onAction?: (action: string) => void;
	variant?: "default" | "trash";
};

const statusVariantMap = {
	draft: "outline" as const,
	published: "default" as const,
	archived: "secondary" as const,
	deleted: "outline" as const,
};

export function GuideCard({ guide, variant = "default", onAction }: Props) {
	const router = useRouter();
	const [restoreDialogOpen, setRestoreDialogOpen] = useState<boolean>(false);
	const [restoring, setRestoring] = useState<boolean>(false);

	const status = guide.status as keyof typeof statusVariantMap;
	const badgeVariant = statusVariantMap[status] ?? "outline";

	const handleRestore = async () => {
		setRestoring(true);
		try {
			await restoreGuide({ data: { guideId: guide.id } });
			toast({
				title: "Success",
				description: "Guide restored",
			});
			setRestoreDialogOpen(false);
			onAction?.("restore");
		} catch (error) {
			const errorMessage =
				error instanceof ApiError
					? error.message
					: error instanceof Error
						? error.message
						: "An error occurred";
			toast({
				title: "Error",
				description: errorMessage,
				variant: "destructive",
			});
		} finally {
			setRestoring(false);
		}
	};

	const handleToggleStar = async (e: React.MouseEvent) => {
		try {
			e.preventDefault();
			e.stopPropagation();
			if (guide.isStarred) {
				await unstarGuide({ data: { guideId: guide.id } });
				toast({
					title: "Guide unstarred",
					description: `You have unstarred the guide.`,
				});
			} else {
				await starGuide({ data: { guideId: guide.id } });
				toast({
					title: "Guide starred",
					description: `You have starred the guide.`,
				});
			}
			router.invalidate();
		} catch (error: any) {
			const errorMessage =
				error instanceof ApiError
					? error.message
					: (error?.message ?? "An unexpected error occurred.");
			toast({
				title: "Error",
				description: errorMessage,
				variant: "destructive",
			});
		}
	};

	const cardContent = (
		<Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
			<CardHeader>
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="text-base">{guide.title}</CardTitle>
					<div className="flex shrink-0 items-center gap-2">
						{variant !== "trash" && (
							<button
								type="button"
								onClick={handleToggleStar}
								className="shrink-0"
							>
								<Star
									className={`h-4 w-4 transition-colors ${guide.isStarred ? "fill-yellow-400 stroke-yellow-500" : "fill-none stroke-gray-400 hover:stroke-yellow-400"}`}
								/>
							</button>
						)}
						<Badge variant={badgeVariant} className="capitalize">
							{guide.status}
						</Badge>
						<GuideCardActions
							guide={guide}
							onAction={onAction}
							variant={variant}
						/>
					</div>
				</div>
				{guide.description && (
					<p className="line-clamp-2 text-sm text-muted-foreground">
						{guide.description}
					</p>
				)}
			</CardHeader>
			<CardFooter className="text-xs text-muted-foreground">
				{guide.updatedAt && (
					<span>
						Updated {format(new Date(guide.updatedAt), "MMM d, yyyy")}
					</span>
				)}
				<span className="mx-1">·</span>
				<span>{formatGuideDuration(guide.durationSeconds)}</span>
			</CardFooter>
		</Card>
	);

	if (variant === "trash") {
		return (
			<>
				<button
					type="button"
					className="block w-full cursor-pointer text-left"
					onClick={() => setRestoreDialogOpen(true)}
				>
					{cardContent}
				</button>
				<ConfirmActionDialog
					open={restoreDialogOpen}
					title="Guide in Trash"
					description={`"${guide.title}" has been deleted and needs to be restored before it can be viewed. Would you like to restore it?`}
					confirmLabel={restoring ? "Restoring..." : "Restore"}
					loading={restoring}
					onConfirm={handleRestore}
					onCancel={() => setRestoreDialogOpen(false)}
				/>
			</>
		);
	}

	return (
		<Link
			to="/dashboard/guides/$guideId"
			params={{ guideId: guide.id }}
			className="block cursor-pointer"
		>
			{cardContent}
		</Link>
	);
}
