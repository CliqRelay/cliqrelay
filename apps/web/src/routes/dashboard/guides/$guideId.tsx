import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	isRedirect,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { ArrowLeft, Eye, PenLine } from "lucide-react";

import { api } from "@repo/api-client";

import { GuideEditor } from "@/components/editor/guides/guide-editor";
import { GuideActionsDropdown } from "@/components/guides/guide-actions-dropdown";
import { GuideStatus } from "@/components/guides/guide-status";
import { StarButton } from "@/components/guides/star-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/lib/toast";
import { getGuideById, updateGuide } from "@/server-fns/guides";
import { starGuide, unstarGuide } from "@/server-fns/starred-guides";

export const Route = createFileRoute("/dashboard/guides/$guideId")({
	component: GuideDetailPage,
	loader: async ({ params, abortController }) => {
		try {
			const guide = await getGuideById({
				data: params.guideId,
				signal: abortController.signal,
			});
			if (!guide) {
				throw redirect({ to: "/dashboard/guides" });
			}
			return { guide };
		} catch (error: any) {
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/dashboard/guides" });
		}
	},
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

function GuideDetailPage() {
	const { user } = Route.useRouteContext();
	const { guide } = Route.useLoaderData();
	const router = useRouter();
	const queryClient = useQueryClient();

	const [mode, setMode] = useState<"view" | "edit">("view");
	const [currentGuide, setCurrentGuide] = useState(guide);

	useEffect(() => {
		setCurrentGuide(guide);
	}, [guide]);

	const handleUpdateGuide = async (updates: {
		title?: string;
		description?: string | null;
	}) => {
		try {
			if (!guide?.id) {
				return;
			}

			await updateGuide({
				data: {
					guideId: guide.id,
					input: updates,
				},
			});
			if (updates.title !== undefined || updates.description !== undefined) {
				setCurrentGuide((prev) => ({
					...prev,
					title: updates.title ?? prev.title,
					description: updates.description ?? prev.description,
				}));
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
			if (!guide?.id) {
				return;
			}

			setCurrentGuide((prev) => ({ ...prev, isStarred: !prev.isStarred }));

			if (currentGuide.isStarred) {
				await unstarGuide({ data: { guideId: guide.id } });
			} else {
				await starGuide({ data: { guideId: guide.id } });
			}
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetAllGuidesQueryKey(),
			});
			queryClient.invalidateQueries({
				queryKey: api.guides.getGetStarredGuidesQueryKey(),
			});
		} catch (error) {
			setCurrentGuide((prev) => ({ ...prev, isStarred: !prev.isStarred }));
			toast.error("Error", {
				description:
					error instanceof Error ? error.message : "Failed to update star",
			});
		}
	};

	return (
		<div className="flex flex-col">
			{/* Sticky header */}
			<header className="sticky top-0 z-10 flex flex-col border-b backdrop-blur-md">
				<div className="flex items-center gap-3 px-4 py-3">
					<Button asChild variant="ghost" size="sm">
						<Link to="/dashboard/guides">
							<ArrowLeft className="h-4 w-4" />
							<span className="sr-only sm:not-sr-only sm:ml-1">Back</span>
						</Link>
					</Button>

					<Separator orientation="vertical" className="h-5" />

					{/* Title */}
					<div className="flex flex-1 items-center gap-3">
						<h1 className="truncate text-lg font-bold">{currentGuide.title}</h1>
						<GuideStatus status={currentGuide.status} />
						<StarButton
							isStarred={currentGuide.isStarred}
							onToggle={handleStarToggle}
						/>
					</div>

					{/* Mode toggle */}
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
				</div>
			</header>

			{/* Main content */}
			{user && (
				<div className="p-6">
					<GuideEditor
						user={user}
						guide={currentGuide}
						mode={mode}
						onModeChange={setMode}
						onUpdateGuide={handleUpdateGuide}
					/>
				</div>
			)}
		</div>
	);
}
