import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Eye, PenLine } from "lucide-react";

import { api, type Guide } from "@repo/api-client";

import { GuideEditor } from "@/components/editor/guides/guide-editor";
import { GuideActionsDropdown } from "@/components/guides/guide-actions-dropdown";
import { GuideStatusBadge } from "@/components/guides/guide-status-badge";
import { StarButton } from "@/components/guides/star-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/lib/toast";
import { updateGuide } from "@/server-fns/guides";
import { starGuide, unstarGuide } from "@/server-fns/starred-guides";
import { useOrgStore, useUserStore } from "@/stores";
import { getCsrfTokenHeader } from "@/utils/http.utils";

export const Route = createFileRoute("/dashboard/guides/$guideId")({
	component: GuideDetailPage,
	beforeLoad: async () => {
		return { hideSiteHeader: true };
	},
	notFoundComponent: GuideNotFound,
});

function GuideNotFound() {
	return (
		<div className="flex items-center justify-center p-12">
			<div className="text-center">
				<h1 className="mb-2 text-2xl font-bold">Guide not found</h1>
				<p className="mb-4 text-sm text-muted-foreground">
					The guide you are looking for does not exist.
				</p>
				<Button asChild variant="outline">
					<Link to="/dashboard/guides">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to guides
					</Link>
				</Button>
			</div>
		</div>
	);
}

function GuideDetailSkeleton() {
	return (
		<div className="flex flex-col">
			<header className="sticky top-0 z-10 flex flex-col bg-background border-b">
				<div className="flex items-center gap-3 px-4 py-3">
					<Skeleton className="h-8 w-20" />
					<Separator orientation="vertical" className="h-5" />
					<div className="flex flex-1 items-center gap-3">
						<Skeleton className="h-6 w-64" />
						<Skeleton className="h-5 w-16 rounded-full" />
						<Skeleton className="h-5 w-5 rounded-full" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-24 rounded-md" />
						<Skeleton className="h-8 w-8 rounded-md" />
					</div>
				</div>
			</header>
			<div className="p-6">
				<div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
					<div className="mb-6 space-y-4">
						<Skeleton className="h-9 w-3/4" />
						<Skeleton className="h-5 w-full" />
						<div className="flex items-center gap-4 text-sm">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-4 w-16" />
						</div>
					</div>
					<div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />
					<div className="flex flex-col gap-6 mt-10">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="rounded-lg border p-4 space-y-3">
								<div className="flex items-center gap-3">
									<Skeleton className="size-4" />
									<Skeleton className="h-5 w-6 rounded-full" />
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-4 w-32" />
								</div>
								<Skeleton className="h-32 w-full rounded-md" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function GuideDetailPage() {
	const { guideId } = Route.useParams();
	const router = useRouter();
	const queryClient = useQueryClient();

	const currentUserId = useUserStore((s) => s.userId);
	const currentMemberRole = useOrgStore((s) => s.currentMember?.role);

	const hasTrackedView = useRef<boolean>(false);

	const [mode, setMode] = useState<"view" | "edit">("view");
	const canEdit = !!currentMemberRole && currentMemberRole !== "viewer";

	const guideQuery = api.guides.useGetGuideById(guideId, {
		request: { credentials: "include" },
	});

	const guide = guideQuery.data?.guide ?? null;
	const [currentGuide, setCurrentGuide] = useState<Guide | null>(guide);

	useEffect(() => {
		if (guide) {
			setCurrentGuide(guide);
		}
	}, [guide]);

	const recordViewMutation = api.guides.useRecordGuideView({
		request: {
			credentials: "include",
			headers: {
				...getCsrfTokenHeader(),
			},
		},
	});

	useEffect(() => {
		if (
			mode === "view" &&
			currentGuide?.status === "published" &&
			currentGuide.creatorId !== currentUserId &&
			!hasTrackedView.current &&
			currentGuide.id
		) {
			hasTrackedView.current = true;
			recordViewMutation.mutate({ id: currentGuide.id });
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetGuideViewsCountQueryKey(),
			});
		}
	}, [
		mode,
		currentGuide?.status,
		currentGuide?.creatorId,
		currentUserId,
		currentGuide?.id,
		recordViewMutation,
	]);

	const handleUpdateGuide = async (updates: {
		title?: string;
		description?: string | null;
	}) => {
		try {
			if (!currentGuide?.id) {
				return;
			}

			await updateGuide({
				data: {
					guideId: currentGuide.id,
					input: updates,
				},
			});
			if (updates.title !== undefined || updates.description !== undefined) {
				setCurrentGuide((prev) => {
					if (!prev) {
						return prev;
					}
					return {
						...prev,
						title: updates.title ?? prev.title,
						description: updates.description ?? prev.description,
					};
				});
			}
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetAllGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetStarredGuidesQueryKey(),
			});
			router.invalidate();
		} catch (error) {
			toast.error("Error", {
				description: error instanceof Error ? error.message : "Failed to save",
			});
		}
	};

	const handleStarToggle = async () => {
		try {
			if (!currentGuide?.id) {
				return;
			}

			setCurrentGuide((prev) => {
				if (!prev) {
					return prev;
				}
				return { ...prev, isStarred: !prev.isStarred };
			});

			if (currentGuide.isStarred) {
				await unstarGuide({ data: { guideId: currentGuide.id } });
			} else {
				await starGuide({ data: { guideId: currentGuide.id } });
			}
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetAllGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetStarredGuidesQueryKey(),
			});
		} catch (error) {
			setCurrentGuide((prev) => {
				if (!prev) {
					return prev;
				}
				return { ...prev, isStarred: !prev.isStarred };
			});
			toast.error("Error", {
				description:
					error instanceof Error ? error.message : "Failed to update star",
			});
		}
	};

	if (guideQuery.isPending) {
		return <GuideDetailSkeleton />;
	}

	if (!guide) {
		return <GuideNotFound />;
	}

	return (
		<div className="flex flex-col">
			<header className="sticky top-0 z-10 flex flex-col bg-background border-b">
				<div className="flex items-center gap-3 px-4 py-3">
					<Button asChild variant="ghost" size="sm">
						<Link to="/dashboard/guides">
							<ArrowLeft className="h-4 w-4" />
							<span className="sr-only sm:not-sr-only sm:ml-1">Back</span>
						</Link>
					</Button>

					<Separator orientation="vertical" className="h-5" />

					<div className="flex flex-1 items-center gap-3">
						<h1 className="truncate text-lg font-bold">
							{currentGuide?.title}
						</h1>
						{currentGuide && <GuideStatusBadge status={currentGuide.status} />}
						{currentGuide && (
							<StarButton
								isStarred={currentGuide.isStarred}
								onToggle={handleStarToggle}
							/>
						)}
					</div>

					{canEdit && currentGuide && (
						<>
							<ToggleGroup
								type="single"
								value={mode}
								onValueChange={(value) => {
									if (value === "view" || value === "edit") {
										setMode(value);
									}
								}}
								variant="outline"
								size="sm"
							>
								<ToggleGroupItem value="view" className="gap-1.5">
									<Eye className="h-3.5 w-3.5" />
									View
								</ToggleGroupItem>
								<ToggleGroupItem value="edit" className="gap-1.5">
									<PenLine className="h-3.5 w-3.5" />
									Edit
								</ToggleGroupItem>
							</ToggleGroup>

							<GuideActionsDropdown guide={guide} />
						</>
					)}
				</div>
			</header>

			<div className="p-6">
				{currentGuide && (
					<GuideEditor
						guide={currentGuide}
						mode={mode}
						onModeChange={setMode}
						onUpdateGuide={handleUpdateGuide}
					/>
				)}
			</div>
		</div>
	);
}
