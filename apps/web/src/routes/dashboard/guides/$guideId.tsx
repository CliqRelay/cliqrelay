import { useState } from "react";

import {
	createFileRoute,
	isRedirect,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { ArrowLeft, Download, Eye, PenLine } from "lucide-react";

import { GuideEditor } from "@/components/editor";
import { ExportDialog } from "@/components/editor/shared/export-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/hooks/use-toast";
import {
	archiveGuide,
	getGuideById,
	publishGuide,
	unarchiveGuide,
	unpublishGuide,
	updateGuide,
} from "@/server-fns/guides";

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

const statusVariantMap = {
	draft: "outline" as const,
	published: "default" as const,
	archived: "secondary" as const,
};

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

	const [mode, setMode] = useState<"view" | "edit">("view");
	const [currentGuide, setCurrentGuide] = useState(guide);
	const [publishDialogOpen, setPublishDialogOpen] = useState(false);
	const [exportDialogOpen, setExportDialogOpen] = useState(false);

	const status = guide.status as keyof typeof statusVariantMap;
	const variant = statusVariantMap[status] ?? "outline";

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
		} catch (error) {
			toast({
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to save",
				variant: "destructive",
			});
		}
	};

	const handlePublish = async () => {
		try {
			if (!guide?.id) {
				return;
			}

			await publishGuide({ data: { guideId: guide.id } });
			toast({
				title: "Published",
				description: "Guide published successfully",
			});
			router.invalidate();
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to publish",
				variant: "destructive",
			});
		}
	};

	const handleUnpublish = async () => {
		if (!guide?.id) return;
		try {
			await unpublishGuide({ data: { guideId: guide.id } });
			toast({ title: "Unpublished", description: "Guide returned to draft" });
			router.invalidate();
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to unpublish",
				variant: "destructive",
			});
		}
	};

	const handleArchive = async () => {
		if (!guide?.id) return;
		try {
			await archiveGuide({ data: { guideId: guide.id } });
			toast({ title: "Archived", description: "Guide archived" });
			router.invalidate();
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to archive",
				variant: "destructive",
			});
		}
	};

	const handleUnarchive = async () => {
		if (!guide?.id) return;
		try {
			await unarchiveGuide({ data: { guideId: guide.id } });
			toast({ title: "Unarchived", description: "Guide returned to draft" });
			router.invalidate();
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to unarchive",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="flex flex-col">
			{/* Sticky header */}
			<header className="sticky top-0 z-10 flex flex-col border-b bg-background">
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
						<Badge variant={variant} className="shrink-0 capitalize">
							{status}
						</Badge>
					</div>

					{/* Mode toggle */}
					<ToggleGroup
						type="single"
						value={mode}
						onValueChange={(v) => {
							if (v === "view" || v === "edit") setMode(v);
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

					{/* Action buttons */}
					{mode === "view" && (
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => setExportDialogOpen(true)}
							>
								<Download className="mr-1 h-3 w-3" />
								Export
							</Button>
						</div>
					)}
					{mode === "edit" && (
						<div className="flex items-center gap-2">
							{status === "draft" && (
								<Button
									size="sm"
									variant="default"
									onClick={() => setPublishDialogOpen(true)}
								>
									Publish
								</Button>
							)}
							{status === "draft" && (
								<Button size="sm" variant="outline" onClick={handleArchive}>
									Archive
								</Button>
							)}
							{status === "published" && (
								<Button size="sm" variant="outline" onClick={handleUnpublish}>
									Unpublish
								</Button>
							)}
							{status === "archived" && (
								<Button size="sm" variant="outline" onClick={handleUnarchive}>
									Unarchive
								</Button>
							)}
						</div>
					)}
				</div>
			</header>

			{/* Main content */}
			<div className="p-6">
				<GuideEditor
					user={user}
					guide={currentGuide}
					mode={mode}
					onModeChange={setMode}
					onUpdateGuide={handleUpdateGuide}
				/>
			</div>

			{/* Publish confirmation dialog */}
			<AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Publish Guide</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to publish this guide?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setPublishDialogOpen(false)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction onClick={handlePublish}>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Export dialog */}
			<ExportDialog
				guideId={guide?.id ?? ""}
				guideTitle={guide?.title ?? "Untitled Guide"}
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
			/>
		</div>
	);
}
